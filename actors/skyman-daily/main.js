import { HttpCrawler, useState } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, log } from "apify";
import { gunzipSync } from "node:zlib";
import { extractProducts, productSlug, sitemapRequests } from "./extract.js";

import { finishRun } from "./finish.js";

const SITEMAP = "https://www.skyman.cz/sitemap.xml";
const TEST_URLS = [
  "https://www.skyman.cz/p/staticke-lano-teufelberger-chameleon-10-5-mm-50-m",
  "https://www.skyman.cz/p/mechanicky-prusik-isc-reflex-v2",
  "https://www.skyman.cz/p/spousteci-lano-sterling-wild-bull-12-7-mm-61-m"
];

await Actor.main(async () => {
  const { development, type = ActorType.Full, urls = [], maxRequestRetries, proxyGroups } = await getInput();
  if (![ActorType.Full, ActorType.Test].includes(type)) throw new Error(`Unsupported actor type: ${type}`);
  const sample = type === ActorType.Test;
  const startUrls = urls.length ? urls : TEST_URLS;
  if (sample && (startUrls.length > 20 || startUrls.some(url => !productSlug(url)))) {
    throw new Error("TEST expects 1 to 20 product URLs from this shop");
  }
  if (!sample && urls.length) throw new Error("Custom URLs require type TEST");
  const processedIds = await useState("processedIds", {});
  const stats = await withPersistedStats({
    items: 0,
    itemsDuplicity: 0,
    itemsChanged: 0,
    sitemapUrls: 0,
    unpricedItems: 0
  });
  const proxyConfiguration = await Actor.createProxyConfiguration({ groups: proxyGroups, useApifyProxy: !development });
  const crawler = new HttpCrawler({
    proxyConfiguration,
    respectRobotsTxtFile: true,
    maxConcurrency: 1,
    maxRequestsPerMinute: 25,
    maxRequestsPerCrawl: sample ? 20 : undefined,
    maxRequestRetries,
    additionalMimeTypes: [
      "application/xml",
      "text/xml",
      "application/gzip",
      "application/x-gzip",
      "application/octet-stream"
    ],
    // Also space retries and the first product request after robots.txt.
    preNavigationHooks: [
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2100));
      }
    ],
    async requestHandler({ request, body }) {
      if (request.userData.label === "SITEMAP") {
        let buffer = Buffer.from(body);
        if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = gunzipSync(buffer);
        const { document } = parseXML(buffer.toString());
        const requests = sitemapRequests(document);
        if (!requests.length) throw new Error(`No product URLs in sitemap: ${request.url}`);
        stats.add("sitemapUrls", requests.filter(r => r.userData.label === "DETAIL").length);
        await crawler.addRequests(requests);
      } else {
        const { document } = parseHTML(body.toString());
        const products = extractProducts(document, request.loadedUrl ?? request.url);
        for (const id of request.userData.variantIds ?? []) {
          if (!products.some(product => product.itemUrl.endsWith(`#${id}`))) {
            throw new Error(`Sitemap variant ${id} missing from ${request.url}`);
          }
        }
        if (!products.length) {
          stats.inc("unpricedItems");
          return;
        }
        stats.add("items", products.length);
        await saveUniqProducts({ products, stats, processedIds });
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Failed: ${request.url}: ${error.message}`);
    }
  });
  const { requestsFinished, requestsFailed } = await crawler.run(
    sample
      ? startUrls.map(url => ({ url, userData: { label: "DETAIL" } }))
      : [{ url: SITEMAP, userData: { label: "SITEMAP" } }]
  );
  await stats.save(true);
  const dataset = await Actor.openDataset();
  const { itemCount } = await dataset.getInfo();
  await finishRun({
    itemCount,
    requestsFinished,
    requestsFailed,
    sample,
    upload: !development && !sample ? () => uploadToKeboola("skyman_cz") : undefined
  });
  log.info(`Finished: ${itemCount} products`);
});
