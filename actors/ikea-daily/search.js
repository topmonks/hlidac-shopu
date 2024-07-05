import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Dataset, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */
/** @typedef {import("@crawlee/basic").RouterHandler} RouterHandler */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").CrawlingContext} CrawlingContext */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

const locales = new Map([
  ["cz", "cz/cs"],
  ["sk", "sk/sk"],
  ["hu", "hu/hu"],
  ["pl", "pl/pl"],
  ["de", "de/de"],
  ["at", "at/de"]
]);

/**
 * @param {string} country
 */
function startUrl(country) {
  const locale = locales.get(country);
  return `https://www.ikea.com/${locale}`;
}

/**
 * Creates request like object for category listing
 * @param {string} country
 * @param {string} category
 * @param {object} pagination
 * @param {number} pagination.pageIndex Default 0
 * @param {number} pagination.pageSize Default 500
 * @returns {RequestOptions}
 */
function getCategoryProducts(country, category, { pageIndex, pageSize } = { pageIndex: 0, pageSize: 500 }) {
  const locale = locales.get(country);
  const payload = {
    "searchParameters": { "input": category, "type": "CATEGORY" },
    "isUserLoggedIn": false,
    "optimizely": {},
    "components": [
      {
        "component": "PRIMARY_AREA",
        "columns": 4,
        "types": {
          "main": "PRODUCT",
          "breakouts": ["PLANNER", "LOGIN_REMINDER"]
        },
        "filterConfig": { "max-num-filters": 5 },
        "window": { "size": pageSize, "offset": pageIndex * pageSize },
        "forceFilterCalculation": true
      }
    ]
  };
  return {
    label: "category",
    userData: { pageIndex, pageSize, country, category },
    url: `https://sik.search.blue.cdtapps.com/${locale}/search?c=listaf&v=20240110`,
    uniqueKey: `${country}::${category}/${pageIndex}:${pageSize}`,
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "Referer": "https://www.ikea.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    payload: JSON.stringify(payload)
  };
}

function* categoryPagination(country, category, { max, pageSize }) {
  const pages = Math.ceil(max / pageSize);
  for (let pageIndex = 1; pageIndex < pages; pageIndex++) {
    yield getCategoryProducts(country, category, { pageIndex, pageSize });
  }
}

function readGlobalNavigation(document) {
  return JSON.parse(document.querySelector(`.hnf-tabs-navigation > script[type='text/hydration']`).textContent);
}

function toProduct({ product }) {
  const isIkeaFamily = product.salesPrice.tag === "FAMILY_PRICE";
  const currentPrice = cleanPrice(product.salesPrice.current?.wholeNumber);
  const originalPrice = cleanPrice(product.salesPrice?.previous?.wholeNumber);
  return {
    get slug() {
      return this.itemId;
    },
    itemId: product.itemNoGlobal,
    itemUrl: product.pipUrl,
    itemName: product.mainImageAlt ?? product.imageAlt,
    img: product.imageUrl ?? null,
    currentPrice: isIkeaFamily ? originalPrice : currentPrice,
    originalPrice: isIkeaFamily ? null : originalPrice,
    currency: product.salesPrice.currencyCode,
    category: product.categoryPath?.map(x => x.name)?.join(" > ") ?? "Nezařazeno",
    discounted: Boolean(product.salesPrice?.previous),
    sale: null, // legacy column
    inStock: product.onlineSellable,
    rating: product.ratingValue,
    numberOfReviews: product.ratingCount
  };
}

/**
 * @param {Object} options
 * @param {string} options.country
 * @param {Stats} options.stats
 * @returns {RouterHandler<CrawlingContext>}
 */
function defRouter({ country, stats, rawData }) {
  return createHttpRouter({
    /** @param {HttpCrawlingContext} ctx */
    async start({ body, crawler }) {
      const { document } = parseHTML(body.toString("utf8"));
      const nav = readGlobalNavigation(document);
      const categories = nav.topCategories.map(x => x.id);
      await crawler.addRequests(categories.map(x => getCategoryProducts(country, x)));
    },
    /** @param {HttpCrawlingContext} ctx */
    async category({ json, request, crawler, log }) {
      const { country, category, pageIndex, pageSize } = request.userData;
      const { end, max } = json.results[0].metadata;
      log.debug("Category pagination", { category, pageIndex, end, max });

      if (pageIndex === 0 && end < max) {
        // We have more products to process
        await crawler.addRequests(Array.from(categoryPagination(country, category, { max, pageSize })));
      }

      for (const item of json.results[0].items) {
        stats.inc("items");
        await rawData.pushData(item);
        await Dataset.pushData(toProduct(item));
      }
    }
  });
}

export async function main() {
  rollbar.init();

  const { maxRequestRetries, country = "cz", type = ActorType.Full, urls } = await getInput();

  if (process.env.DEBUG) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    items: 0,
    totalCount: 0,
    failed: 0
  });

  const rawData = await Dataset.open("raw");

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    additionalMimeTypes: ["application/json"],
    requestHandler: defRouter({ country, stats, rawData }),
    async failedRequestHandler({ request }, error) {
      stats.inc("failed");
      log.error(`failed request ${request.url}`, error);
    }
  });

  const requests = urls?.length ? urls : [{ url: startUrl(country), label: "start" }];

  log.debug("Starting IKEA crawler", { country, type, urls: requests });
  await crawler.run(requests);

  await Promise.all([stats.save(true), uploadToKeboola(`ikea_${country}`)]);
}
