import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler } from "@crawlee/http";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { choices, partition, take, transduce, push } from "@thi.ng/transducers";
import { sleep } from "@crawlee/utils";
import { defAtom } from "@thi.ng/atom";
import { co, Channel } from "core-async";

/** @typedef { import("@aws-sdk/client-s3").S3Client } S3Client */

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
        result.originalPrice = result.currentPrice;
        result.originalUnitPrice = result.currentUnitPrice;
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
 * @returns {{urls: string[], userData: {label: Label.List, categoryId: string}}
 */
function categoriesRequests({ count, categoryId, categoriesById }) {
  log.info(
    `${count} products in ${categoriesById?.[categoryId]?.name ?? categoryId}`
  );
  const limitPerPage = 100;
  const urls = [];
  for (let i = 0; i * limitPerPage < count; i++) {
    urls.push(
      `https://www.rohlik.cz/api/v1/categories/normal/${categoryId}/products?page=${i}`
    );
  }
  return {
    urls,
    userData: {
      label: Label.List,
      categoryId
    }
  };
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
 * @param {{categoryId: string, categoriesById: Object.<string, Category>}}
 * @returns {{url: string, userData: {label: Label.Count, categoryId: string}[]}}
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
 * @param {{productIds: number[], categoryId: string, requestedProductsIds: Set<number>, stats: Stats}}
 * @returns {{urls: string[], userData: {label: Label.Detail, categoryId: string}}
 */
function detailRequests({
  productIds,
  categoryId,
  requestedProductsIds,
  stats
}) {
  stats.inc("categoryPagesCount");
  const newProductIds = productIds.filter(
    item => !requestedProductsIds.has(item)
  );
  const urls = [];
  for (const productIdsBatch of partition(
    productsPerRequest,
    true,
    newProductIds
  )) {
    const productsParams = new URLSearchParams();
    productIdsBatch.forEach(id => {
      requestedProductsIds.add(id);
      productsParams.append("products", id.toString());
    });
    urls.push(`https://www.rohlik.cz/api/v1/products/prices?${productsParams}`);
    urls.push(`https://www.rohlik.cz/api/v1/products?${productsParams}`);
  }
  return {
    urls,
    userData: {
      label: Label.Detail,
      categoryId
    }
  };
}

function mergeProductsData({ productList, items, itemsForSaving }) {
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
 * @returns {T[]}
 */
function takeRandomIfDev(isDevelopment, coll) {
  return isDevelopment ? transduce(take(50), push(), choices(coll)) : coll;
}

async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = process.env.TEST || process.env.DEBUG,
    maxConcurrency = 5,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input;

  const stats = await withPersistedStats(x => x, {
    categoriesTotal: 0,
    subCategoriesTotal: 0,
    categoryPagesCount: 0,
    items: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  let categoriesById = await KeyValueStore.getValue("categoriesById");
  const requestedProductsIds = new Set();
  const items = defAtom([]);
  const itemsForSaving = new Channel(maxConcurrency * (productsPerRequest * 2));

  // save items as they are put into `itemsForSaving`
  co(function* () {
    while (true) {
      try {
        const item = yield itemsForSaving.take();
        if (!item) return;
        const product = normalizeItem({
          item,
          categoriesById
        });
        Promise.all([Dataset.pushData(product), uploadToS3v2(s3, product)])
          .then(() => stats.inc("items"))
          .catch(e => {
            log.error(e);
          });
      } catch (e) {
        log.error(e);
      }
    }
  });

  const requestQueue = await Actor.openRequestQueue();
  const crawler = new HttpCrawler({
    requestQueue,
    maxConcurrency,
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100
    },
    async requestHandler({ request, json, enqueueLinks }) {
      const { userData } = request;
      const { categoryId } = userData;
      log.info(`Processing ${request.url}`);
      switch (userData.label) {
        case Label.Main:
          categoriesById = json.navigation;
          KeyValueStore.setValue("categoriesById", categoriesById);
          await requestQueue.addRequests(
            takeRandomIfDev(
              development,
              categoriesCountRequests({
                categoriesById,
                stats
              })
            )
          );
          break;
        case Label.Count:
          await enqueueLinks(
            categoriesRequests({
              count: json.results,
              categoryId,
              categoriesById
            })
          );
          break;
        case Label.List:
          await enqueueLinks(
            detailRequests({
              productIds: json.productIds,
              categoryId,
              requestedProductsIds,
              stats
            })
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

      await sleep(750);
    },
    async failedRequestHandler({ request }, error) {
      await sleep(2500);
      log.error(
        `Request ${request.url} failed ${request.retryCount} times`,
        error
      );
    }
  });

  const listCategoriesUrl =
    "https://www.rohlik.cz/services/frontend-service/renderer/navigation/flat.json";
  await crawler.run([
    {
      url: listCategoriesUrl,
      userData: { label: Label.Main }
    }
  ]);

  try {
    await sleep(5000);
    itemsForSaving.close();
    await Promise.all([
      stats.save(true),
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", "rohlik.cz"),
      uploadToKeboola("rohlik")
    ]);

    log.info("invalidated Data CDN");
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
}

await Actor.main(main);
