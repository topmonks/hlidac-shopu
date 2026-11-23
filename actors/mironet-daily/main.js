import zlib from "zlib";
import { HttpCrawler, RequestQueueV1 } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, log } from "apify";
import {
  firstPageRequest,
  Labels,
  lastPage,
  listingItems,
  pageUrl,
  rootCategories,
  startingRequests
} from "./listing.js";

/**
 * @param {string | Buffer} buffer
 * @returns {string[]}
 */
function sitemapCategoryUrls(buffer) {
  log.info("Loading Sitemap");
  const markup = zlib.unzipSync(buffer).toString();
  const { document } = parseXML(markup);
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => {
      // e.g. <loc><![CDATA[https://www.mironet.cz]]></loc>
      // x.textContent would return empty string, we need to use innerHTML and remove CDATA manually
      return x.innerHTML.replace("<![CDATA[", "").replace("]]>", "");
    });
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats({ categories: 0, pages: 0, items: 0, itemsDuplicity: 0, failed: 0 });
  const {
    development,
    maxRequestRetries,
    type = ActorType.Full,
    urls,
    bfUrl,
    useRootCategories = true
  } = await getInput();
  const rootUrl = "https://www.mironet.cz";
  const shop = shopName(rootUrl);

  const unblocker = await Actor.createProxyConfiguration({ groups: ["UNBLOCKER"], checkAccess: false });
  const proxyUrl = await unblocker?.newUrl();
  if (!unblocker?.password || !proxyUrl) throw new Error("Apify UNBLOCKER credentials are unavailable");
  // Keep Crawlee sessions without adding a session identifier to the UNBLOCKER URL.
  const proxyConfiguration = await Actor.createProxyConfiguration({ newUrlFunction: () => proxyUrl });
  if (!proxyConfiguration) throw new Error("Apify UNBLOCKER is unavailable");

  const requestQueue = await RequestQueueV1.open(Actor.getEnv().defaultRequestQueueId, {
    storageClient: Actor.isAtHome() ? Actor.apifyClient : undefined
  });
  const dataset = await Actor.openDataset();
  const processedIds = new Set();
  await dataset.forEach(
    ({ itemId }) => {
      processedIds.add(itemId);
    },
    { fields: ["itemId"] }
  );

  const crawler = new HttpCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    // Some UNBLOCKER responses take longer than 30 seconds.
    navigationTimeoutSecs: 90,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: 200 },
    maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/x-gzip"],
    preNavigationHooks: [
      ({ request }, gotOptions) => {
        // UNBLOCKER requests can use different routes with different ALPN support.
        gotOptions.sessionToken = request;
      }
    ],
    async requestHandler({ body, request, enqueueLinks }) {
      const { label, baseUrl } = request.userData;
      if (request.loadedUrl?.includes("/altcha/")) {
        throw new Error(`Bot challenge instead of ${request.url}: ${request.loadedUrl}`);
      }
      if (label === Labels.Categories) {
        const all = sitemapCategoryUrls(body);
        const categories = useRootCategories ? rootCategories(all) : all;
        log.info(`Scraping ${categories.length} of ${all.length} categories from the sitemap`);
        stats.add("categories", categories.length);
        await requestQueue.addRequests(categories.map(firstPageRequest));
        return;
      }

      const { document } = parseHTML(body.toString());
      if (label === Labels.Page) {
        const pages = Array.from({ length: lastPage(document) - 1 }, (_, i) => pageUrl(baseUrl, i + 2));
        if (pages.length) {
          stats.add("pages", pages.length);
          await enqueueLinks({ urls: pages, userData: { label: Labels.Pages } });
        }
      }

      const items = listingItems({ document, rootUrl });
      const newItems = [];
      for (const item of items) {
        if (processedIds.has(item.itemId)) {
          stats.inc("itemsDuplicity");
          continue;
        }
        processedIds.add(item.itemId);
        newItems.push({ ...item, shop, slug: itemSlug(item.itemUrl) });
      }
      stats.add("items", items.length);
      await dataset.pushData(newItems);
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed after ${request.retryCount} retries`, error);
      stats.inc("failed");
    }
  });

  await crawler.run(startingRequests({ type, urls, bfUrl }));
  await stats.save(true);

  const { items, failed } = stats.get();
  if (!items) throw new Error(`No products scraped (${failed} failed requests) - blocked or site structure changed`);

  if (!development) {
    await uploadToKeboola(type !== ActorType.Full ? "mironet_bf" : "mironet");
    log.info("Upload to Keboola finished");
  }
}

await Actor.main(main);
