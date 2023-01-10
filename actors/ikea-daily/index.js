import { parseHTML } from "linkedom/cached";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import {
  cleanPrice,
  toProduct,
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Actor, Dataset, log, LogLevel, KeyValueStore } from "apify";
import { HttpCrawler } from "@crawlee/http";

/** @typedef { import("apify").Request } RequestLike */

/** @enum */
const Type = {
  Daily: "DAILY",
  Count: "COUNT",
  LinkedData: "LINKED_DATA",
  Test: "TEST"
};

/** @enum */
const Label = {
  Start: "START",
  Index: "INDEX",
  Detail: "DETAIL"
};

const testCategory = {
  url: "https://sik.search.blue.cdtapps.com/cz/cs/product-list-page/more-products?category=20874&start=24&end=48&c=lf&v=20211124&sort=RELEVANCE",
  userData: { label: Label.Index }
};

const locales = new Map([
  ["cz", "cz/cs"],
  ["sk", "sk/sk"],
  ["hu", "hu/hu"],
  ["pl", "pl/pl"],
  ["de", "de/de"],
  ["at", "at/de"]
]);

function startUrl(country) {
  const locale = locales.get(country);
  return `https://www.ikea.com/${locale}/cat/products-index-index/`;
}

function feedUrl(country, page) {
  const locale = locales.get(country);
  const start = (page - 1) * 100;
  const end = start + 100;
  return `https://sik.search.blue.cdtapps.com/${locale}/special/more-products?special=all&start=${start}&end=${end}&subcategories-style=tree-navigation&c=lf&v=20211124&sort=RELEVANCE`;
}

/**
 * Get total items count from document
 * @param {Document} document
 * @returns {number} Total count
 */
function getTotalCount(document) {
  const productList = document.querySelector(".js-product-list[data-category]");
  const { totalCount } = JSON.parse(productList.dataset.category);
  return totalCount;
}

/**
 * Reads HTML from response
 * @param {string | Buffer} body
 * @returns {Document}
 */
function html(body) {
  const { document } = parseHTML(body.toString());
  return document;
}

function parseProduct(x) {
  return {
    itemId: x.itemNoGlobal,
    itemName: x.mainImageAlt ?? x.imageAlt,
    itemUrl: x.pipUrl,
    img: x.mainImageUrl,
    inStock: x.onlineSellable,
    currentPrice: x.priceNumeral,
    originalPrice: cleanPrice(x.prevPrice?.wholeNumber),
    currency: x.currencyCode,
    discounted: Boolean(x.prevPrice)
  };
}

async function processIndex(json, requestQueue) {
  const { moreProducts } = json;
  const products = moreProducts.productWindow;
  for (const product of products) {
    const data = parseProduct(product);

    // ehnance product data from detail page
    await requestQueue.addRequest({
      url: product.pipUrl,
      userData: { label: Label.Detail, product: data }
    });

    // enhance product variants data
    const { variants } = product.gprDescription;
    for (const variant of variants) {
      await requestQueue.addRequest({
        url: variant.pipUrl,
        userData: {
          label: Label.Detail,
          product: Object.assign({}, data, {
            itemId: variant.itemNoGlobal,
            itemUrl: variant.pipUrl,
            itemName: variant.mainImageAlt ?? variant.imageAlt ?? data.itemName,
            img: variant.imageUrl ?? data.imageUrl,
            currentPrice: cleanPrice(variant.price?.wholeNumber),
            originalPrice: cleanPrice(variant.prevPrice?.wholeNumber),
            discounted: Boolean(variant.prevPrice),
            inStock: variant.onlineSellable
          })
        }
      });
    }
  }
}

async function processTotalCount(body, requestQueue, country, stats) {
  const document = html(body);
  const count = getTotalCount(document);
  stats.add("total-count", count);
  const pages = Math.ceil(count / 100);
  for (let page = 1; page <= pages; page++) {
    await requestQueue.addRequest({
      url: feedUrl(country, page),
      userData: { label: Label.Index }
    });
  }
  return pages;
}

function getCategory(document) {
  return Array.from(document.querySelectorAll(".bc-breadcrumb__list-item"))
    .map(el => el.innerText.trim())
    .join(" > ");
}

/**
 *
 * @param {RequestLike} request
 * @param {string | Buffer} body
 * @param {Stats} stats
 * @returns {Promise<*>}
 */
async function processDetail(request, body, stats) {
  const { product } = request.userData;
  const document = html(body);
  const category = getCategory(document);
  Object.assign(product, { category });
  await Dataset.pushData(product);
  stats.inc("items");
  return product;
}

async function handleResponse({
  request,
  body,
  json,
  requestQueue,
  country,
  stats
}) {
  log.debug("handling request", {
    url: request.url,
    label: request.userData.label
  });
  switch (request.userData.label) {
    case Label.Start:
      return processTotalCount(body, requestQueue, country, stats);
    case Label.Index:
      return processIndex(json, requestQueue);
    case Label.Detail:
      return processDetail(request, body, stats);
  }
}

function processResult(type, stats, startUrl) {
  switch (type) {
    case Type.Test:
      return async (label, data) => {
        log.debug(label, data);
      };
    case Type.Daily:
      return async (label, data) => {
        if (label === Label.Detail) {
          stats.inc("items");
          await Dataset.pushData(data);
        }
      };
    case Type.Count:
      return async (label, data) => {
        if (label === Label.Start) {
          stats.add("items", data);
          await Dataset.pushData({ numberOfProducts: data });
        }
      };
    case Type.LinkedData:
      const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
      const cloudfront = new CloudFrontClient({
        region: "eu-central-1",
        maxAttempts: 3
      });
      return async (label, data) => {
        if (label === Label.Detail) {
          await uploadToS3v2(s3, toProduct(data));
          await invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopName(startUrl));
        }
      };
  }
}

export async function main() {
  rollbar.init();

  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    maxRequestRetries = 3,
    maxConcurrency = 100,
    country = "cz",
    type = Type.Daily,
    testUrls = [testCategory]
  } = input;

  if (process.env.DEBUG) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    items: 0,
    errors: 0,
    totalCount: 0
  });

  const requestQueue = await Actor.openRequestQueue();
  const processData = processResult(type, stats, startUrl(country));

  const crawler = new HttpCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    async requestHandler({ request, body, json }) {
      const { userData, url } = request;
      log.info(`processing request ${url}`);
      const result = await handleResponse({
        request,
        body,
        json,
        requestQueue,
        country,
        stats
      });
      return processData(userData.label, result);
    },
    async failedRequestHandler({ request }, error) {
      stats.inc("errors");
      log.error(`failed request ${request.url}`, error);
    }
  });

  const sources =
    type === Type.Test
      ? testUrls
      : [{ url: startUrl(country), userData: { label: Label.Start } }];
  await crawler.run(sources);

  await Promise.all([
    stats.save(true),
    uploadToKeboola(shopName(startUrl(country)))
  ]);

  // COUNT
  // push totalCount to dataset

  // DAILY
  // start scraping index in loop
  // push data to DataSet
  // upload to Keboola

  // LINKED_DATA
  // start scraping index in loop
  // upload to S3 and invalidate CDN
}
