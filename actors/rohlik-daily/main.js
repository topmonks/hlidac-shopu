import { setTimeout as sleep } from "node:timers/promises";
import { HttpCrawler, useState } from "@crawlee/http";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { defAtom } from "@thi.ng/atom";
import { choices, partition, push, take, transduce } from "@thi.ng/transducers";
import { Actor, Dataset, LogLevel, log } from "apify";
import { Channel, co } from "core-async";

/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

/** @enum {string} */
const Label = {
  Main: "main",
  Count: "count",
  List: "list",
  Detail: "detail"
};

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {number} occurrence
 * @property {number} position
 * @property {string} name
 * @property {boolean} aboveAverage
 * @property {string=} templateName
 * @property {string} link
 * @property {number} companyId
 * @property {number} parentId
 * @property {number[]} children
 */

/**
 * @param {{categoryId: number, categoriesById: Object.<string, Category>}}
 * @returns {string[]}
 */
function getBreadCrumbs({ categoryId, categoriesById }) {
  const breadcrumbs = [];
  while (categoriesById[categoryId]) {
    const category = categoriesById[categoryId];
    breadcrumbs.push(category.name);
    categoryId = category.parentId;
  }
  breadcrumbs.reverse();
  return breadcrumbs;
}

/**
 * @typedef {Object} Item
 * @property {number} productId
 * @property {string[]=} images
 * @property {string} name
 * @property {string} slug
 * @property {{amount: number, currency: string}} price
 * @property {{amount: number, currency: string}=} pricePerUnit
 * @property {{type: string, price: {amount: number}, priceForUnit?: {amount: number}}[]=} sales
 * @property {string} textualAmount
 */

/**
 * @typedef {Object} ProductItem
 * @property {string | null} img
 * @property {number} itemId
 * @property {string} itemUrl
 * @property {string} itemName
 * @property {boolean} discounted
 * @property {number | null} currentPrice
 * @property {number | null} currentUnitPrice
 * @property {string | null} currency
 * @property {boolean} useUnitPrice
 * @property {number=} originalPrice
 * @property {number | null} originalUnitPrice
 * @property {number} mainCategoryId
 * @property {string} breadcrumbs
 */

/**
 * @param {{item: Item, categoriesById: Object.<string, Category>}}
 * @returns {ProductItem}
 */
export function normalizeItem({ item, categoriesById }) {
  const breadCrumbs = getBreadCrumbs({
    categoryId: item.mainCategoryId,
    categoriesById
  });
  const result = {
    img: item.images?.[0] ?? null,
    itemId: item.productId ?? null,
    itemUrl: `https://www.rohlik.cz/${item.productId}-${item.slug}`,
    itemName: item.name,
    discounted: false,
    currentPrice: item.price?.amount ?? null,
    currentUnitPrice: item.pricePerUnit?.amount ?? null,
    currency: item.price?.currency ?? null,
    useUnitPrice: item.textualAmount?.includes("cca"),
    category: breadCrumbs.join(" > ")
  };
  if (item.sales.length !== 0) {
    for (const sale of item.sales) {
      if (sale.type === "sale") {
        if (!sale.silent) {
          result.originalPrice = result.currentPrice;
          result.originalUnitPrice = result.currentUnitPrice;
        }
        result.currentPrice = sale.price?.amount ?? null;
        result.currentUnitPrice = sale.priceForUnit?.amount ?? null;
        result.discounted = true;
      }
    }
  }
  return result;
}

/**
 * @param {{categoryId: string, count: number, categoriesById: Object.<string, Category>}}
 * @returns {{url: string, userData: {label: string, categoryId: string}}[]}
 */
function categoriesRequests({ count, categoryId, categoriesById }) {
  log.info(`${count} products in ${categoriesById?.[categoryId]?.name ?? categoryId}`);
  const limitPerPage = 100;
  const requests = [];
  for (let i = 0; i * limitPerPage < count; i++) {
    requests.push({
      url: `https://www.rohlik.cz/api/v1/categories/normal/${categoryId}/products?page=${i}`,
      userData: {
        label: Label.List,
        categoryId
      }
    });
  }
  return requests;
}

/**
 * @param {number} categoryId
 * @returns {{url: string, userData: {label: Label.Count, categoryId: string}}}
 */
function productsCountInCategoryRequest(categoryId) {
  return {
    url: `https://www.rohlik.cz/api/v1/categories/normal/${categoryId}/products/count`,
    userData: {
      label: Label.Count,
      categoryId: categoryId.toString()
    }
  };
}

/**
 * @param {{categoriesById: Object.<string, Category>, stats: Stats}}
 */
function categoriesCountRequests({ categoriesById, stats }) {
  const categories = Object.values(categoriesById);
  log.debug(`Adding to the queue ${categories.length} of categories`);
  const requests = [];
  for (const category of categories) {
    stats.inc("categoriesTotal");
    requests.push(productsCountInCategoryRequest(category.id));

    const subCategories = category.children;
    if (subCategories.length) {
      log.debug(`Adding to the queue ${subCategories.length} of subCategories`);
    }
    for (const subCategory of subCategories) {
      stats.inc("subCategoriesTotal");
      requests.push(productsCountInCategoryRequest(subCategory));
    }
  }
  return requests;
}

const productsPerRequest = 15;

/**
 * @param {{productIds: number[], categoryId: string, stats: Stats}}
 */
function detailRequests({ productIds, categoryId, stats, requestedIds }) {
  stats.inc("categoryPagesCount");
  const requests = [];
  for (const productIdsBatch of partition(productsPerRequest, true, productIds)) {
    const productsParams = new URLSearchParams();
    for (const id of productIdsBatch) {
      if (!requestedIds[id]) {
        productsParams.append("products", id.toString());
        requestedIds[id] = true;
      } else {
        stats.inc("productsAlreadyRequested");
      }
    }
    requests.push({
      url: `https://www.rohlik.cz/api/v1/products/prices?${productsParams}`,
      userData: {
        label: Label.Detail,
        type: "prices",
        categoryId
      }
    });
    requests.push({
      url: `https://www.rohlik.cz/api/v1/products?${productsParams}`,
      userData: {
        label: Label.Detail,
        type: "products",
        categoryId
      }
    });
  }
  return requests;
}

function mergeProductsData({ productList, items, itemsForSaving }) {
  if (!Array.isArray(productList)) {
    log.warning(productList);
    return;
  }
  log.info(`Received ${productList.length} products`);
  productList.forEach(item => {
    items.swap(_items => {
      const id = item.id ?? item.productId;
      const prevItem = _items[id];
      const newItem = Object.assign(item, prevItem);
      if (newItem.name && newItem.price) {
        co(function* () {
          yield itemsForSaving.put(newItem);
        });
      }
      _items[id] = newItem;
      return _items;
    });
  });
}

/**
 * @template T
 * @param {boolean} isDevelopment
 * @param {T[]} coll
 * @param {number} [n=50]
 * @returns {T[]}
 */
function takeRandomIfDev(isDevelopment, coll, n = 200) {
  return isDevelopment ? transduce(take(n), push(), choices(coll)) : coll;
}

async function main() {
  rollbar.init();

  const { development, proxyGroups, debug } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    categoriesTotal: 0,
    subCategoriesTotal: 0,
    categoryPagesCount: 0,
    items: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  let categoriesById = await useState("categoriesById", {});
  const processedIds = await useState("processedIds", {});
  const requestedIds = await useState("requestedIds", {});
  console.dir({ categoriesById, processedIds, requestedIds }, { depth: null });
  const items = defAtom([]);
  const itemsForSaving = new Channel(500);

  // save items as they are put into `itemsForSaving`
  co(function* () {
    while (true) {
      try {
        const item = yield itemsForSaving.take();
        if (!item) continue;
        const product = normalizeItem({
          item,
          categoriesById
        });
        const itemId = product.itemId;
        if (processedIds[itemId]) {
          stats.inc("itemsAlreadyProcessed");
          continue;
        }
        Dataset.pushData(product)
          .then(() => {
            processedIds[itemId] = true;
            stats.inc("items");
            return true;
          })
          .catch(e => {
            log.error(e);
          });
      } catch (e) {
        log.error(e);
      }
    }
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: development ? Infinity : 300,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 100
    },
    async requestHandler({ request, json, body, crawler }) {
      const { userData } = request;
      const { categoryId } = userData;
      log.info(`Processing ${request.url} (${userData.label})`);

      // Rohlik sometimes responds with json body but `content-type: text/html` header, so crawlee fails to parse JSON automatically
      if (!json && body) {
        try {
          json = JSON.parse(body.toString());
        } catch (err) {
          log.error(`Failed to parse JSON from body, aborting requestHandler`, err);
          return;
        }
      }
      switch (userData.label) {
        case Label.Main:
          Object.assign(categoriesById, json.navigation);
          await crawler.requestQueue.addRequests(
            takeRandomIfDev(
              development,
              categoriesCountRequests({
                categoriesById,
                stats
              })
            ),
            { forefront: true }
          );
          break;
        case Label.Count:
          await crawler.requestQueue.addRequests(
            categoriesRequests({
              count: json.results,
              categoryId,
              categoriesById
            })
          );
          break;
        case Label.List:
          await crawler.requestQueue.addRequests(
            detailRequests({
              productIds: json.productIds,
              categoryId,
              stats,
              requestedIds
            }),
            { forefront: true }
          );
          break;
        case Label.Detail:
          mergeProductsData({
            productList: json,
            items,
            itemsForSaving
          });
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed ${request.retryCount} times`, error);
      stats.inc("failed");
    }
  });

  const listCategoriesUrl = "https://www.rohlik.cz/services/frontend-service/renderer/navigation/flat.json";
  await crawler.run([
    {
      url: listCategoriesUrl,
      userData: { label: Label.Main }
    }
  ]);

  try {
    await sleep(5000);
    itemsForSaving.close();
    await Promise.all([stats.save(true), uploadToKeboola("rohlik")]);

    log.info("invalidated Data CDN");
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
}

await Actor.main(main);
