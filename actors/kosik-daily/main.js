import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

const baseUrl = "https://www.kosik.cz/";

const slug = url => url.substring(1);
const listingUrl = ({ url }) =>
  `${baseUrl}api/web/page/products?slug=${slug(url)}&limit=60`;

const slugBF = url => new URL(url).pathname.substring(1);
const listingBFUrl = url =>
  `${baseUrl}api/web/page/products?slug=${slugBF(url)}&limit=60`;

function* categoriesTree(root) {
  for (const category of root) {
    if (category.subcategories) yield* categoriesTree(category.subcategories);
    yield listingUrl(category);
  }
}

/**
 *
 * @param {RequestQueue} requestQueue
 * @param categories
 * @returns {Promise<void>}
 */
async function enqueueCategories(requestQueue, { categories }) {
  for (const url of categoriesTree(categories)) {
    await requestQueue.addRequest({
      url,
      userData: { step: "DETAIL" }
    });
  }
}

/**
 *
 * @param {RequestQueue} requestQueue
 * @param products
 * @returns {Promise<void>}
 */
async function enqueuePagination(requestQueue, { products }) {
  if (products?.more) {
    await requestQueue.addRequest({
      url: products.more,
      userData: { step: "DETAIL" }
    });
  }
}

const parseItem = (item, breadcrumbs) => {
  let itemUrl = new URL(item.url, baseUrl).href;
  return {
    itemId: item.id,
    itemUrl,
    itemName: item.name,
    discounted: item.percentageDiscount > 0,
    discountedName:
      item.percentageDiscount > 0 ? `${item.percentageDiscount} %` : null,
    currentPrice: item.price,
    originalPrice:
      item.price == item.recommendedPrice ? null : item.recommendedPrice,
    inStock: !item.firstOrderDay,
    category: breadcrumbs,
    img: item.image,
    shop: shopName(itemUrl),
    slug: itemSlug(itemUrl),
    shopOrigin: shopOrigin(itemUrl)
  };
};

/**
 * @param {RequestQueue} requestQueue
 * @param {S3Client} s3
 * @returns {CheerioHandlePage}
 */
function pageFunction(requestQueue, s3) {
  const processedIds = new Set();

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handlePageFunction(context) {
    const { request, response, json } = context;
    if (response.statusCode !== 200) {
      log.info("Status code:", response.statusCode);
    }

    const { step } = request.userData;
    if (step === "CATEGORIES") {
      await enqueueCategories(requestQueue, json);
    } else if (step === "DETAIL") {
      await enqueuePagination(requestQueue, json);

      const breadcrumbs =
        json.breadcrumbs?.map(x => x.name)?.join(" > ") ?? json.title;
      for (const item of json.products.items) {
        if (processedIds.has(item.id)) continue;
        const detail = parseItem(item, breadcrumbs);
        await Promise.all([
          Apify.pushData(detail),
          uploadToS3v2(s3, detail, { priceCurrency: "CZK" })
        ]);
        processedIds.add(item.id);
      }
    }

    log.info("handled page", { url: request.url });
  }

  return handlePageFunction;
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
    development,
    maxConcurrency = 4,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrls = ["https://www.kosik.cz/listy/bf-nanecisto-2021"]
  } = input ?? {};

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  if (type === ActorType.BF) {
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url: listingBFUrl(url),
        userData: {
          step: "DETAIL"
        }
      });
    }
  } else {
    await requestQueue.addRequest({
      url: "https://www.kosik.cz/api/web/menu/main",
      userData: {
        step: "CATEGORIES"
      }
    });
  }

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries: 3,
    requestTimeoutSecs: 60,
    additionalMimeTypes: ["application/json", "text/plain"],
    handlePageFunction: pageFunction(requestQueue, s3),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "kosik.cz");
    log.info("invalidated Data CDN");

    try {
      let tableName = `kosik`;
      if (type === ActorType.BF) {
        tableName = `${tableName}_bf`;
      }
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
});
