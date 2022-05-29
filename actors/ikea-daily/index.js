import Apify from "apify";
import { timeoutSignal, context } from "@adobe/helix-fetch";
import { parseHTML } from "linkedom";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { defAtom } from "@thi.ng/atom";
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
import UserAgent from "user-agents";

/** @typedef { import("apify").Request } RequestLike */

const userAgent = new UserAgent();
const { fetch } = context({
  userAgent: userAgent().toString(),
  rejectUnauthorized: false
});

const Type = {
  DAILY: "DAILY",
  COUNT: "COUNT",
  LINKED_DATA: "LINKED_DATA",
  TEST: "TEST"
};

const Label = {
  START: "START",
  INDEX: "INDEX",
  DETAIL: "DETAIL"
};

const testCategory = {
  url: "https://sik.search.blue.cdtapps.com/cz/cs/product-list-page/more-products?category=20874&start=24&end=48&c=lf&v=20211124&sort=RELEVANCE",
  userData: { label: Label.INDEX }
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
 * @param {Response} response
 * @returns {Promise<Document>}
 */
async function html(response) {
  const body = await response.text();
  const { document } = parseHTML(body);
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

async function processIndex(response, requestQueue) {
  const { moreProducts } = await response.json();
  const products = moreProducts.productWindow;
  for (const product of products) {
    const data = parseProduct(product);

    // ehnance product data from detail page
    await requestQueue.addRequest({
      url: product.pipUrl,
      userData: { label: Label.DETAIL, product: data }
    });

    // enhance product variants data
    const { variants } = product.gprDescription;
    for (const variant of variants) {
      await requestQueue.addRequest({
        url: variant.pipUrl,
        userData: {
          label: Label.DETAIL,
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

async function processTotalCount(response, totalCount, requestQueue, country) {
  const document = await html(response);
  const count = totalCount.reset(getTotalCount(document));
  const pages = Math.ceil(count / 100);
  for (let page = 1; page <= pages; page++) {
    await requestQueue.addRequest({
      url: feedUrl(country, page),
      userData: { label: Label.INDEX }
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
 * @param {Response} response
 * @param {Stats} stats
 * @returns {Promise<*>}
 */
async function processDetail(request, response, stats) {
  const { product } = request.userData;
  const document = await html(response);
  const category = getCategory(document);
  Object.assign(product, { category });
  await Apify.pushData(product);
  stats.inc("items");
  return product;
}

async function handleResponse({
  request,
  response,
  totalCount,
  requestQueue,
  country,
  stats
}) {
  Apify.utils.log.debug("handling request", {
    url: request.url,
    label: request.userData.label
  });
  switch (request.userData.label) {
    case Label.START:
      return processTotalCount(response, totalCount, requestQueue, country);
    case Label.INDEX:
      return processIndex(response, requestQueue);
    case Label.DETAIL:
      return processDetail(request, response, stats);
  }
}

function processResult(type, stats, startUrl) {
  switch (type) {
    case Type.TEST:
      return async (label, data) => {
        Apify.utils.log.debug(label, data);
      };
    case Type.DAILY:
      return async (label, data) => {
        if (label === Label.DETAIL) {
          stats.inc("items");
          await Apify.pushData(data);
        }
      };
    case Type.COUNT:
      return async (label, data) => {
        if (label === Label.START) {
          stats.add("items", data);
          await Apify.pushData({ numberOfProducts: data });
        }
      };
    case Type.LINKED_DATA:
      const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
      const cloudfront = new CloudFrontClient({
        region: "eu-central-1",
        maxAttempts: 3
      });
      return async (label, data) => {
        if (label === Label.DETAIL) {
          await uploadToS3v2(s3, toProduct(data));
          await invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopName(startUrl));
        }
      };
  }
}

async function main() {
  rollbar.init();

  const input = await Apify.getInput();
  const {
    maxRequestRetries = 3,
    maxConcurrency = 100,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = Type.DAILY,
    testUrls = [testCategory]
  } = input ?? {};

  if (process.env.DEBUG) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    items: 0,
    errors: 0
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const sources =
    type === Type.TEST
      ? testUrls
      : [{ url: startUrl(country), userData: { label: Label.START } }];
  const requestList = await Apify.openRequestList("ikea-start", sources);
  const requestQueue = await Apify.openRequestQueue();
  const totalCount = defAtom(null);
  const processData = processResult(type, stats, startUrl(country));

  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    async handleRequestFunction({ request }) {
      const { url, userData } = request;
      const response = await fetch(url, { signal: timeoutSignal(30000) });
      if (!response.ok) {
        stats.inc("errors");
        Apify.utils.log.error("failed request", await response.json());
      }
      const result = await handleResponse({
        request,
        response,
        totalCount,
        requestQueue,
        country,
        stats
      });
      return processData(userData.label, result);
    }
  });

  await crawler.run();
  Apify.utils.log.info("crawler finished");

  await Promise.all([
    stats.save(),
    uploadToKeboola(shopName(startUrl(country)))
  ]);

  Apify.utils.log.info("Finished.");

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

Apify.main(main);
