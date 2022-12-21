import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";

/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */

export const BlackFridayCategoryID = 187082;
export const PageSize = 100;

/** @enum */
export const Label = {
  Category: "CATEGORY",
  Detail: "DETAIL",
  Pagination: "PAGINATION"
};

export function categoryPaginationPayload(categoryId, page) {
  return {
    "client": "eshop",
    "excludeAvailabilities": [],
    "parameterSettings": {
      "parameters": ["5"],
      "availability": true,
      "price": true,
      "tags": false,
      "stock": true,
      "review": false,
      "topCategories": true
    },
    "query": {
      "parameters": [],
      "price": { "level": "NORMAL", "intervals": [] },
      "availability": [],
      "stocks": [],
      "review": null,
      "tags": [],
      "sort": { "sortBy": "article", "order": "ASC" },
      "paging": { "limit": PageSize, page },
      "category": null,
      "article": categoryId,
      "storeMode": false,
      "topCategories": []
    },
    "seoAlias": null
  };
}

/**
 *
 * @param {number} categoryId
 * @param {number} page
 * @return {RequestOptions}
 */
export function categoryRequest(categoryId, page) {
  return {
    url: "https://parameter-filter.nay.sk/filter-products/3",
    useExtendedUniqueKey: true,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Origin": "https://www.electroworld.cz",
      "Referer": "https://www.electroworld.cz/"
    },
    userData: { label: Label.Category, categoryId, page },
    payload: JSON.stringify(categoryPaginationPayload(categoryId, page))
  };
}

export function categoryPaginationRequest(categoryId, page) {
  return {
    url: "https://parameter-filter.nay.sk/filter-products/3",
    uniqueKey: `https://parameter-filter.nay.sk/filter-products/3?category=${categoryId}&page=${page}`,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Origin": "https://www.electroworld.cz",
      "Referer": "https://www.electroworld.cz/"
    },
    userData: { label: Label.Pagination, categoryId, page },
    payload: JSON.stringify(categoryPaginationPayload(categoryId, page))
  };
}

export function toQuery(itemIds) {
  return itemIds.map(itemId => `id[]=${encodeURIComponent(itemId)}`).join("&");
}

export function categoryItemsRequest(itemIds) {
  const query = toQuery(itemIds);
  return {
    url: `https://www.electroworld.cz/api/eshop/product-boxes?${query}`,
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Origin": "https://www.electroworld.cz",
      "Referer": "https://www.electroworld.cz/blackfriday"
    },
    userData: { label: Label.Detail }
  };
}

/**
 * @param {ActorType} type
 * @param {string[]} urls
 * @return {string[]|RequestOptions[]}
 */
export function initialRequests(type, urls) {
  if (urls.length) return urls;
  switch (type) {
    case ActorType.BlackFriday: {
      const categoryId = BlackFridayCategoryID; // black friday 2022 category
      const page = 1; // starts at 1
      return [categoryRequest(categoryId, page)];
    }
    default: {
      log.info("Unknown actor type and no URLs provided");
      return urls;
    }
  }
}

function getPostfix(type) {
  switch (type) {
    case ActorType.BlackFriday:
      return "_bf";
    default:
      return "";
  }
}

export function getTableName(country, type) {
  const countryCode = country.toLowerCase();
  const postfix = getPostfix(type);
  return `electroworld_${countryCode}${postfix}`;
}

function checkResponseStatus(session, response, stats) {
  if (response.statusCode === 403) {
    stats.inc("denied");
    session.isBlocked();
    throw new Error("Access Denied");
  }
  if (response.statusCode === 200) stats.inc("ok");
  session.setCookiesFromResponse(response);
}

export function extractDetail(
  url,
  { product, priceBundle, averageReview, productAvailability }
) {
  return {
    itemId: product.id,
    itemName: product.name,
    itemUrl: new URL(`/${product.alias}`, url).href,
    img: `https://cdn.electroworld.cz/images/product-w510h463/1/${product.image.id}.${product.image.extension}`,
    category: "Black friday",
    rating: cleanPrice(averageReview.value),
    inStock: productAvailability.eshop?.title === "Skladem",
    get available() {
      return this.inStock;
    },
    currentPrice: cleanPrice(priceBundle.sellPrice.amount),
    originalPrice: cleanPrice(priceBundle.oldPrice?.amount),
    currency: "CZK"
  };
}

function* pages(totalCount) {
  const pages = Math.ceil(totalCount / PageSize);
  for (let page = 2; page <= pages; page++) {
    yield page;
  }
}

export async function main() {
  const rollbar = Rollbar.init();
  const input = (await KeyValueStore.getInput()) ?? {};

  const {
    country = "CZ",
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.BlackFriday,
    urls = []
  } = input;

  const requestQueue = await Actor.openRequestQueue();
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0,
    denied: 0,
    ok: 0
  });

  const crawler = new HttpCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    async requestHandler({ session, request, response, json, log }) {
      const { label, categoryId, page } = request.userData;
      log.info("processing page", {
        url: request.url,
        label,
        categoryId,
        page
      });
      checkResponseStatus(session, response, stats);

      switch (label) {
        case Label.Category: {
          stats.inc("categories");
          const { totalCount, products } = json;
          for (const page of pages(totalCount)) {
            await requestQueue.addRequest(
              categoryPaginationRequest(categoryId, page)
            );
          }
          return requestQueue.addRequest(
            categoryItemsRequest(products.map(x => x.id))
          );
        }
        case Label.Pagination: {
          stats.inc("pages");
          const { products } = json;
          return requestQueue.addRequest(
            categoryItemsRequest(products.map(x => x.id))
          );
        }
        case Label.Detail: {
          const { productBoxes } = json;
          stats.add("items", productBoxes.length);
          const result = productBoxes.map(x => extractDetail(request.url, x));
          return Dataset.pushData(result);
        }
      }
    },
    async failedRequestHandler({ request }, error) {
      stats.inc("failed");
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed 4 times. ${error.message}`);
    }
  });

  await crawler.run(initialRequests(type, urls));
  await stats.save(true);

  const tableName = getTableName(country, type);
  await uploadToKeboola(tableName);
}
