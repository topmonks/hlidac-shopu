import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import CloudFlareUnBlocker from "./cloudflare-unblocker.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

/** @typedef { import("./apify.json").ApifyEnv } ApifyEnv */
/** @typedef { import("./apify.json").ActorRun } ActorRun */
/** @typedef { import("./apify.json").RequestQueue } RequestQueue */
/** @typedef { import("./apify.json").RequestList } RequestList */
/** @typedef { import("./apify.json").ProxyConfiguration } ProxyConfiguration */

const { log, requestAsBrowser } = Apify.utils;

const Label = {
  MAIN: "main",
  LIST: "list",
  DETAIL: "PAGE"
};

let jsonCategories = {};
const firstPage =
  "https://www.rohlik.cz/services/frontend-service/renderer/navigation/flat.json";

const processedIds = new Set();

function getBreadCrumbs(categoryId, jsonCategories) {
  const breadcrumbs = [];
  while (jsonCategories[categoryId]) {
    const category = jsonCategories[categoryId];
    breadcrumbs.push(category.name);
    categoryId = category.parentId;
  }
  breadcrumbs.reverse();
  return breadcrumbs;
}

export default function getItems(items, jsonCategories) {
  const results = [];
  for (const item of items) {
    const result = {
      img: item.imgPath ?? null,
      itemId: item.productId ?? null,
      itemUrl: item.baseLink ? `https://www.rohlik.cz/${item.baseLink}` : null,
      itemName: item.productName ?? null,
      discounted: false,
      currentPrice: item.price?.full ?? null,
      currentUnitPrice: item.pricePerUnit?.full ?? null,
      currency: item.price?.currency ?? null,
      inStock: item.inStock,
      useUnitPrice: item.textualAmount.includes("cca")
    };
    if (item.sales.length !== 0) {
      for (const sale of item.sales) {
        if (sale.type === "sale") {
          result.originalPrice = result.currentPrice;
          result.originalUnitPrice = result.currentUnitPrice;
          result.currentPrice = sale.price?.full ?? null;
          result.currentUnitPrice = sale.priceForUnit?.full ?? null;
          result.discounted = true;
        }
      }
    } else if (item.goodPrice) {
      const { originalPrice } = item;
      result.originalPrice = originalPrice.full;
      result.discounted = true;
    }
    result.breadcrumbs = getBreadCrumbs(item.mainCategoryId, jsonCategories);
    results.push(result);
  }
  return results;
}

async function processItem(s3, products, stats) {
  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  const unprocessedProducts = products.filter(p => !processedIds.has(p.itemId));
  for (const item of unprocessedProducts) {
    stats.inc("items");
    const product = {
      ...item,
      category: item.breadcrumbs.join(" > ")
    };
    requests.push(
      // push data to dataset to be ready for upload to Keboola
      Apify.pushData(item),
      // upload JSON+LD data to CDN
      uploadToS3v2(s3, product, { priceCurrency: "CZK" })
    );
    processedIds.add(item.itemId);
  }
  // await all requests, so we don't end before they end
  await Promise.all(requests);
}

async function processMain(body, stats, requestQueue) {
  const categories = Object.keys(body.navigation);
  jsonCategories = body.navigation;
  if (categories.length) {
    log.debug(`Adding to the queue ${categories.length} of categories`);
    for (const category of categories) {
      stats.inc("categories");
      await requestQueue.addRequest(
        new Apify.Request({
          // url: `https://www.rohlik.cz/services/frontend-service/products/${category}?offset=0&limit=25`,
          url: `https://www.rohlik.cz/api/v1/categories/normal/${category}/products?page=0`,
          userData: {
            label: Label.LIST,
            categoryId: category
          },
          uniqueKey: category.toString()
        })
      );
      const subCategories = body.navigation[category].children;
      if (subCategories.length) {
        log.debug(
          `Adding to the queue ${subCategories.length} of subCategories`
        );
      }
      for (const subCategory of subCategories) {
        stats.inc("subCategories");
        await requestQueue.addRequest(
          new Apify.Request({
            // url: `https://www.rohlik.cz/services/frontend-service/products/${subCategory}?offset=0&limit=25`,
            url: `https://www.rohlik.cz/api/v1/categories/normal/${subCategory}/products?page=0`,
            userData: {
              label: Label.LIST,
              categoryId: subCategory
            },
            uniqueKey: subCategory.toString()
          })
        );
      }
    }
  }
}

async function processList(body, request, stats, requestQueue, s3) {
  console.log({ body });
  const max = Math.ceil(body.data.totalHits / 25) * 25;
  const { categoryId } = request.userData;
  max !== 0 &&
    log.debug(
      `Adding to the queue ${max} for https://www.rohlik.cz/services/frontend-service/products/${categoryId}?offset=0&limit=25`
    );
  for (let i = 25; i <= max; i += 25) {
    await requestQueue.addRequest(
      new Apify.Request({
        url: `https://www.rohlik.cz/services/frontend-service/products/${categoryId}?offset=${i}&limit=25`,
        userData: {
          label: Label.DETAIL,
          categoryId
        }
      })
    );
  }
  if (body.data?.productList?.length) {
    log.debug(
      `Stroring ${body.data.productList.length} items for category ${categoryId}`
    );
    const products = getItems(body.data.productList, jsonCategories);
    await processItem(s3, products, stats);
  }
}

async function processDetail(request, body, s3, stats) {
  const { categoryId } = request.userData;
  if (body.data?.productList?.length) {
    log.debug(
      `Storing ${body.data.productList.length} items for category ${categoryId}`
    );
    const products = getItems(body.data.productList, jsonCategories);
    await processItem(s3, products, stats);
  }
}

Apify.main(async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = await Apify.getInput();

  const {
    country = "cz",
    maxConcurrency = 5,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    subCategories: 0,
    items: 0
  });

  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest(
    new Apify.Request({
      url: firstPage,
      userData: { label: Label.MAIN }
    })
  );
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: true
  });
  const cloudFlareUnBlocker = new CloudFlareUnBlocker({
    unblockUrl: firstPage,
    proxyConfiguration
  });

  // Create crawler.
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency,
    useSessionPool: true,
    handleRequestFunction: async function ({ request, session }) {
      const response = await requestAsBrowser({
        url: request.url,
        json: true,
        ...cloudFlareUnBlocker.getRequestOptions(session)
      });
      session.setCookiesFromResponse(response);
      const { statusCode, body } = response;

      if (statusCode !== 200 && statusCode !== 404) {
        session.retire();
        // don't mark this request as bad, it is probably looking for working session
        request.retryCount--;
        // don't retry the request right away, wait a little bit
        await Apify.utils.sleep(5000);
        throw new Error("Session blocked, retiring.");
      }

      switch (request.userData.label) {
        case Label.MAIN:
          await processMain(body, stats, requestQueue);
          break;
        case Label.LIST:
          await processList(body, request, stats, requestQueue, s3);
          break;
        case Label.DETAIL:
          await processDetail(request, body, s3, stats);
          break;
      }

      await Apify.utils.sleep(1000);
    },
    sessionPoolOptions: {
      maxPoolSize: 100,
      createSessionFunction:
        cloudFlareUnBlocker.createSessionFunction.bind(cloudFlareUnBlocker)
    },

    // If request failed 4 times then this function is executed.
    async handleFailedRequestFunction({ request }) {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  // Run crawler.
  await crawler.run();
  log.info("crawler finished");

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
});
