import { HttpCrawler, createHttpRouter, useState } from "@crawlee/http";
import { Sitemap } from "@crawlee/utils";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  itemSlug,
  parseFloatText,
  saveUniqProducts,
  shopName,
  shopOrigin
} from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { cleanPriceText } from "@hlidac-shopu/lib/parse.mjs";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

/** @enum {string} */
export const Labels = {
  CATEGORY: "category"
};

/** @enum {string} */
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

export const rootCZ = "https://www.drmax.cz";
export const rootSK = "https://www.drmax.sk";

export const rootWebUrl = country => (country === Country.CZ ? rootCZ : rootSK);

function defRouter(processedIds, stats) {
  return createHttpRouter({
    /** @param {HttpCrawlingContext} context */
    async category({ body, enqueueLinks, log, response }) {
      const categoryUrl = response.url;

      log.debug("Extracting category", { url: categoryUrl });
      const { document } = parseHTML(body.toString());

      const items = document.querySelectorAll(`[data-test-id="product_grid"] [data-test-id="category-tile-product"]`);

      for (const item of items) {
        const path = item.querySelector('[data-test-id="category-tile-product-link"] a')?.href;
        const priceBox = item.querySelector('[data-test-id="category-tile-product-price"]');
        const title = item.querySelector('[data-test-id="category-tile-product-name"]')?.textContent.trim();
        const shortDesc = item.querySelector(".tile__desc")?.textContent.trim();

        const itemUrl = new URL(path ?? "", response.url).href;
        const imageSrc = item.querySelector("img")?.src ?? null;
        const imageUrl = imageSrc ? new URL(imageSrc ?? "", response.url).href : null;

        const currentPrice = parseFloatText(cleanPriceText(priceBox.childNodes[0]?.textContent.trim() ?? ""));
        const originalPrice = parseFloatText(
          cleanPriceText(priceBox.querySelector(".tile__price__before")?.textContent.trim() ?? "")
        );

        const outOfStock = !!item.querySelector(".product__out-of-stock");

        log.debug("Extracting product", { path, itemUrl, currentPrice, originalPrice });

        const itemId = item.querySelector("meta").getAttribute("content");
        await saveUniqProducts({
          products: [
            {
              shop: shopName(itemUrl),
              shopOrigin: shopOrigin(itemUrl),
              slug: itemSlug(itemUrl),
              itemId,
              itemUrl,
              itemName: title,
              img: imageUrl,
              shortDesc,
              inStock: !outOfStock,
              category: new URL(categoryUrl).pathname,
              originalPrice: originalPrice,
              currentPrice: currentPrice,
              discounted: !!originalPrice
            }
          ],
          stats,
          processedIds
        });
      }

      const nextPageUrl = document.querySelector(".page-next a")?.href;
      if (!nextPageUrl) return;
      await enqueueLinks({
        urls: [nextPageUrl],
        label: Labels.CATEGORY
      });
    }
  });
}

async function main() {
  Rollbar.init();

  const {
    development,
    debug,
    proxyGroups,
    country = Country.CZ,
    maxRequestRetries = 4,
    urls
  } = await getInput({ urls: null });

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = rootWebUrl(country);
  const processedIds = await useState("processedIds");
  const stats = await withPersistedStats({
    items: 0,
    itemNoPrice: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const sitemap = await Sitemap.load([`${rootUrl.replace("www", "backend")}/media/sitemap/kategorie.xml`]);

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 300,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries,
    requestHandler: defRouter(processedIds, stats),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run(urls ?? sitemap.urls.map(url => ({ url, label: Labels.CATEGORY })));

  const tableName = country === Country.CZ ? "drmax_cz" : "drmax_sk";

  await uploadToKeboola(tableName);
  log.info("upload to Keboola finished");
}

await Actor.main(main, { statusMessage: "Finished." });
