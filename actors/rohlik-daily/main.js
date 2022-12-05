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
import { partition } from "@thi.ng/transducers";
import { sleep } from "@crawlee/utils";
import { defAtom } from "@thi.ng/atom";

/** @typedef { import("@aws-sdk/client-s3").S3Client } S3Client */

/** @enum {string} */
const Label = {
  Main: "main",
  Count: "count",
  List: "list",
  Detail: "detail"
};

/**
 * @typedef {Object} UserData
 * @property {Label} label
 * @property {number} categoryId
 */

/**
 * @typedef {Object} TODO
 * @property {number} categoryId
 * @property {string} categoryType
 * @property {string[]} productIds
 */

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
 * @typedef {Object} Categories
 * @property {string} staticContentUrl
 * @property {Object.<string, Category>} navigation
 */

/**
 * @param {{categoryId: string | number, categoriesById: Object.<string, Category>}}
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
 * @param {{item: Item, categoriesById: Object.<string, Category>, categoryId: string | number}}
 * @returns {ProductItem}
 */
export function getItem({ item, categoriesById, categoryId }) {
  const result = {
    img: item.imgPath ?? null,
    itemId: item.productId ?? null,
    itemUrl: `https://www.rohlik.cz/${item.productId}-${item.slug}`,
    itemName: item.name ?? null,
    discounted: false,
    currentPrice: item.price?.amount ?? null,
    currentUnitPrice: item.pricePerUnit?.amount ?? null,
    currency: item.price?.currency ?? null,
    useUnitPrice: item.textualAmount?.includes("cca")
  };
  if (item.sales.length !== 0) {
    for (const sale of item.sales) {
      if (sale.type === "sale") {
        result.originalPrice = result.currentPrice;
        result.originalUnitPrice = result.currentUnitPrice;
        result.currentPrice = sale.price?.amount ?? null;
        result.currentUnitPrice = sale.priceForUnit?.full ?? null;
        result.discounted = true;
      }
    }
  }
  result.breadcrumbs = getBreadCrumbs({ categoryId, categoriesById });
  return result;
}

async function processItem({ s3, item }) {
  const requests = [];
  const product = Object.assign(item, {
    category: item.breadcrumbs.join(" > ")
  });
  requests.push(Dataset.pushData(item), uploadToS3v2(s3, product));
  await Promise.all(requests);
}

/**
 * @param {{categoryId: string}}
 * @returns {PromiseLike<number>}
 */
async function getProductsCountInCategory({ categoryId, requestQueue }) {
  return await requestQueue.addRequest({
    url: `https://www.rohlik.cz/api/v1/categories/normal/${categoryId}/products/count`,
    userData: {
      label: Label.Count,
      categoryId: categoryId
    }
  });
}

/**
 * @param {{categoryId: string}}
 * @returns {PromiseLike<number>}
 */
async function enqueueCategories({
  count,
  categoryId,
  requestQueue,
  categoriesById
}) {
  console.log(`${count} products in ${categoriesById[categoryId].name}`);
  const limitPerPage = 100;
  for (let i = 0; i * limitPerPage < count; i++) {
    await requestQueue.addRequest({
      url: `https://www.rohlik.cz/api/v1/categories/normal/${categoryId}/products?page=${i}`,
      userData: {
        label: Label.List,
        categoryId: categoryId
      }
    });
  }
}

/**
 * @param {{categoriesById: Object.<string, Category>}}
 * @returns {Promise<void>}
 */
async function processMain({ categoriesById, stats, requestQueue }) {
  const categories = Object.values(categoriesById);
  log.debug(`Adding to the queue ${categories.length} of categories`);
  for (const category of categories) {
    stats.inc("categories");
    await getProductsCountInCategory({
      categoryId: category.id.toString(),
      requestQueue
    });

    const subCategories = category.children;
    if (subCategories.length) {
      log.debug(`Adding to the queue ${subCategories.length} of subCategories`);
    }
    for (const subCategory of subCategories) {
      stats.inc("subCategories");
      await getProductsCountInCategory({
        categoryId: subCategory.toString(),
        requestQueue
      });
    }
    if (subCategories.length) {
      break; // TODO: remove
    }
  }
}

async function processList({
  productIds,
  requestQueue,
  categoryId,
  stats,
  processedIds
}) {
  const newProductIds = productIds.filter(item => !processedIds.has(item));
  for (const productIdsBatch of partition(10, true, newProductIds)) {
    const productsParams = new URLSearchParams();
    productIdsBatch.forEach(id => {
      processedIds.add(id);
      productsParams.append("products", id.toString());
    });
    await requestQueue.addRequest({
      url: `https://www.rohlik.cz/api/v1/products/prices?${productsParams}`,
      userData: {
        label: Label.Detail,
        categoryId
      }
    });
    await requestQueue.addRequest({
      url: `https://www.rohlik.cz/api/v1/products?${productsParams}`,
      userData: {
        label: Label.Detail,
        categoryId
      }
    });
    stats.inc("items");
  }
}

async function mergeProductsData({ productList, itemsForSaving }) {
  productList.forEach(item => {
    itemsForSaving.swap(items => {
      const id = item.id ?? item.productId;
      const prevItem = items[id];
      items[id] = Object.assign(item, prevItem);
      return items;
    });
  });
}

async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = (await KeyValueStore.getInput()) ?? {};
  const { maxConcurrency = 5, proxyGroups = ["CZECH_LUMINATI"] } = input;

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    subCategories: 0,
    items: 0
  });

  const requestQueue = await Actor.openRequestQueue();
  const firstPage =
    "https://www.rohlik.cz/services/frontend-service/renderer/navigation/flat.json";
  await requestQueue.addRequest({
    url: firstPage,
    userData: { label: Label.Main }
  });
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: true
  });

  const processedIds = new Set();
  const itemsForSaving = defAtom([]);

  let categoriesById;
  const crawler = new HttpCrawler({
    requestQueue,
    maxConcurrency,
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100
    },
    async requestHandler({ request, json }) {
      const { userData } = request;
      const { categoryId } = userData;
      log.info(`Processing ${request.url}`);
      switch (userData.label) {
        case Label.Main:
          categoriesById = json.navigation;
          await processMain({
            categoriesById,
            stats,
            requestQueue
          });
          break;
        case Label.Count:
          await enqueueCategories({
            count: json.results,
            requestQueue,
            categoryId,
            categoriesById
          });
          break;
        case Label.List:
          await processList({
            productIds: json.productIds,
            categoryId,
            categoriesById,
            stats,
            requestQueue,
            processedIds
          });
          break;
        case Label.Detail:
          await mergeProductsData({
            productList: json,
            itemsForSaving
          });
          break;
      }

      await sleep(1000);
    },
    async failedRequestHandler({ request }) {
      await sleep(5000);
      log.info(`Request ${request.url} failed ${request.retryCount} times`);
    }
  });

  await crawler.run();

  for (const item of Object.values(itemsForSaving.deref())) {
    const itemForSave = getItem({
      item: item,
      categoriesById,
      categoryId: item.mainCategoryId
    });
    await processItem({ s3, item: itemForSave, stats, processedIds });
  }

  try {
    await Promise.all([
      stats.save(),
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
