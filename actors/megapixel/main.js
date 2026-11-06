import { createHttpRouter, HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, Dataset, LogLevel, log } from "apify";
import { fridayNoirCategoryUrls, listingPageUrls, listingProducts } from "./listing.js";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

const PROCESSED_IDS_KEY = "processedIds";

/** Black Friday landing page, it links all Friday Noir categories */
const FRIDAY_NOIR_URL = "https://www.megapixel.cz/slevove-akce-a-cashbacky";

/**
 * shortcut: inStock is always true (as in 4camping), the tile's availability text ("Skladem 1 ks",
 * "Skladem u dodavatele", ...) is not parsed; read it if out-of-stock products start to matter
 * @param {ReturnType<typeof listingProducts>[number]} product
 * @returns {Product}
 */
function toProduct({ itemId, itemUrl, itemName, img, currentPrice, originalPrice }) {
  return {
    shop: shopName(itemUrl),
    shopOrigin: shopOrigin(itemUrl),
    slug: itemSlug(itemUrl),
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    originalPrice,
    currency: "CZK",
    discounted: originalPrice !== null,
    inStock: true
  };
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async start({ request, body, crawler }) {
      const { userData } = request;
      const { document } = parseHTML(body.toString());
      const urls = fridayNoirCategoryUrls(document, request.url);
      if (!urls.length) throw new Error(`No Friday Noir categories found on ${request.url}`);
      log.info(`Found ${urls.length} Friday Noir categories`, { urls });
      // test run scrapes only the first page of the first category
      const categories = userData.type === ActorType.Test ? urls.slice(0, 1) : urls;
      stats.add("categories", categories.length);
      await crawler.addRequests(categories.map(url => ({ url, label: "category", userData })));
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async category({ request, body, crawler }) {
      const { url, userData } = request;
      const { document } = parseHTML(body.toString());
      const products = listingProducts(document, url);
      if (!products.length) throw new Error(`No products found on ${url}`);
      stats.inc("pages");

      if (userData.type !== ActorType.Test) {
        const pages = listingPageUrls(document, url);
        await crawler.addRequests(pages.map(url => ({ url, label: "category", userData })));
      }

      const batch = [];
      for (const product of products) {
        if (processedIds.has(product.itemId)) {
          stats.inc("duplicates");
          continue;
        }
        processedIds.add(product.itemId);
        batch.push(toProduct(product));
      }
      stats.add("products", batch.length);
      await Dataset.pushData(batch);
    }
  });
}

/**
 * @param {Object} params
 * @param {ActorType} params.type BF, or TEST for the first page of the first category
 * @param {RequestOptions[]} params.urls Friday Noir category URLs to scrape instead of discovering them
 * @returns {RequestOptions[]}
 */
function getStartUrls({ type, urls }) {
  if (type !== ActorType.BlackFriday && type !== ActorType.Test) {
    throw new Error(`Unsupported type ${type}, megapixel scrapes only the Black Friday (BF) products`);
  }
  const userData = { type };
  if (urls?.length) return urls.map(x => ({ ...x, label: "category", userData }));
  return [{ url: FRIDAY_NOIR_URL, label: "start", userData }];
}

async function main() {
  Rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats({
    categories: 0,
    pages: 0,
    products: 0,
    duplicates: 0,
    failed: 0
  });

  const {
    type = ActorType.BlackFriday,
    debug,
    proxyGroups,
    urls,
    maxConcurrency = 10,
    maxRequestRetries
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries,
    proxyConfiguration,
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run(getStartUrls({ type, urls }));

  await stats.save(true);

  if (!processedIds.size) {
    throw new Error("No products scraped - blocked or site structure changed");
  }

  await uploadToKeboola("megapixel_cz_bf");
}

await Actor.main(main, { statusMessage: "DONE" });
