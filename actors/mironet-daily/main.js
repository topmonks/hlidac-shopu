import zlib from "zlib";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";
import {
  ajaxCategoryId,
  ajaxPageItems,
  ajaxPageRequest,
  fallbackPageRequest,
  Labels,
  lastPage,
  listingItems,
  pageUrl,
  readBreadCrumbs,
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

  const stats = await withPersistedStats({
    categories: 0,
    pages: 0,
    ajaxPages: 0,
    ajaxFallbacks: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const {
    development,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full,
    urls,
    bfUrl,
    // pages 2+ of categories through the lighter AJAX endpoint, `false` loads the regular pages
    useAjaxPages = true,
    // only the top-level categories of the sitemap, `false` reads every category (each product ~3 times)
    useRootCategories = true
  } = await getInput();
  const rootUrl = "https://www.mironet.cz";
  const shop = shopName(rootUrl);

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const processedIds = new Set();

  /** @param {Object[]} items */
  async function saveItems(items) {
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
    await Dataset.pushData(newItems);
  }

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/x-gzip", "application/json"],
    async requestHandler({ body, request, response, enqueueLinks, crawler }) {
      log.info(`Processing ${request.url}`);
      const { label } = request.userData;
      if (label === Labels.Categories) {
        const all = sitemapCategoryUrls(body);
        const categories = useRootCategories ? rootCategories(all) : all;
        log.info(`Scraping ${categories.length} of ${all.length} categories from the sitemap`);
        stats.add("categories", categories.length);
        await crawler.requestQueue.addRequests(
          categories.map(url => ({ url, userData: { label: Labels.Page, baseUrl: url } }))
        );
        return;
      }
      if (label === Labels.AjaxPage) {
        const { breadCrumbs } = request.userData;
        const items = ajaxPageItems({ statusCode: response.statusCode, body: body.toString(), rootUrl, breadCrumbs });
        if (!items) {
          log.warning(`AJAX page unusable (status ${response.statusCode}), loading the regular page`, {
            url: request.url
          });
          stats.inc("ajaxFallbacks");
          await crawler.addRequests([fallbackPageRequest(request.userData)]);
          return;
        }
        stats.inc("ajaxPages");
        await saveItems(items);
        return;
      }
      const html = body.toString();
      const { document } = parseHTML(html);
      if (label === Labels.Page || label === Labels.Pages) {
        if (label === Labels.Page) {
          const { baseUrl } = request.userData;
          const pageTotal = lastPage(document);
          const catId = useAjaxPages ? ajaxCategoryId(html, baseUrl) : null;
          const breadCrumbs = readBreadCrumbs(document);
          const pages = Array.from({ length: Math.max(pageTotal - 1, 0) }, (_, i) => i + 2);
          log.debug(`Found ${pageTotal} pages on ${request.url}`);
          stats.add("pages", pages.length);
          if (pages.length && catId) {
            await crawler.addRequests(pages.map(page => ajaxPageRequest({ catId, page, baseUrl, breadCrumbs })));
          } else if (pages.length) {
            await enqueueLinks({
              urls: pages.map(page => pageUrl(baseUrl, page)),
              userData: { label: Labels.Pages, baseUrl }
            });
          }
        }
        const items = listingItems({ document, rootUrl });
        log.debug(`Found ${items.length} items, storing them. ${request.url}`);
        await saveItems(items);
      }
    },
    async failedRequestHandler({ request }, error) {
      if (request.userData.label === Labels.AjaxPage) {
        log.warning(`AJAX page failed, loading the regular page: ${error.message}`, { url: request.url });
        stats.inc("ajaxFallbacks");
        await crawler.addRequests([fallbackPageRequest(request.userData)]);
        return;
      }
      log.error(`Request ${request.url} failed ${request.retryCount} times`, error);
      stats.inc("failed");
    }
  });

  log.info("ACTOR - run crawler");
  await crawler.run(startingRequests({ type, urls, bfUrl }));

  log.info("ACTOR - crawler end");
  await stats.save(true);

  if (!development) {
    await uploadToKeboola(type !== ActorType.Full ? "mironet_bf" : "mironet");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
}

await Actor.main(main);
