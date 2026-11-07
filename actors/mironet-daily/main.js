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
import { Labels, listingItems, pageUrls, startingRequest } from "./listing.js";

/**
 * @param {string | Buffer} buffer
 * @returns {{url: string, userData: {label: Labels.Page, baseUrl: string}}[]}
 */
function allCategoriesRequests(buffer) {
  log.info("Loading Sitemap");
  const markup = zlib.unzipSync(buffer).toString();
  const { document } = parseXML(markup);
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => {
      // e.g. <loc><![CDATA[https://www.mironet.cz]]></loc>
      // x.textContent would return empty string, we need to use innerHTML and remove CDATA manually
      const url = x.innerHTML.replace("<![CDATA[", "").replace("]]>", "");
      return {
        url,
        userData: {
          label: Labels.Page,
          baseUrl: url
        }
      };
    });
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats({
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const { development, maxRequestRetries, proxyGroups, type = ActorType.Full, urls, bfUrl } = await getInput();
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

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/x-gzip"],
    async requestHandler({ body, request, enqueueLinks, crawler }) {
      log.info(`Processing ${request.url}`);
      const { label } = request.userData;
      if (label === Labels.Categories) {
        const requests = allCategoriesRequests(body);
        await crawler.requestQueue.addRequests(requests);
        return;
      }
      const { document } = parseHTML(body.toString());
      if (label === Labels.Page || label === Labels.Pages) {
        if (label === Labels.Page) {
          const urls = pageUrls({ document, baseUrl: request.userData.baseUrl });
          log.debug(`Found ${urls.length + 1} pages on ${request.url}`);
          stats.add("pages", urls.length);
          if (urls.length) {
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.Pages,
                baseUrl: request.userData.baseUrl
              }
            });
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
        log.debug(`Found ${items.length} items, storing them. ${request.url}`);
        await Dataset.pushData(newItems);
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed ${request.retryCount} times`, error);
      stats.inc("failed");
    }
  });

  const request = startingRequest({ type, urls, bfUrl });
  log.info("ACTOR - run crawler");
  await crawler.run([request]);

  log.info("ACTOR - crawler end");
  await stats.save(true);

  if (!development) {
    await uploadToKeboola(type !== ActorType.Full ? "mironet_bf" : "mironet");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
}

await Actor.main(main);
