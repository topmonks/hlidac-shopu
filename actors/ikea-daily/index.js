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
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Dataset, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */

/** @enum {string} */
const Type = {
  Daily: "DAILY",
  Count: "COUNT",
  LinkedData: "LINKED_DATA",
  Test: "TEST"
};

/** @enum {string} */
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

/**
 * @param {string} country
 */
function startUrl(country) {
  const locale = locales.get(country);
  return `https://sik.search.blue.cdtapps.com/${locale}/special?special=all&size=24&subcategories-style=tree-navigation&c=lf&v=20220826&sort=RELEVANCE`;
}

/**
 * @param {string} country
 * @param {number} page
 */
function feedUrl(country, page) {
  const locale = locales.get(country);
  const start = (page - 1) * 100;
  const end = start + 100;
  return `https://sik.search.blue.cdtapps.com/${locale}/special/more-products?special=all&start=${start}&end=${end}&subcategories-style=tree-navigation&c=lf&v=20211124&sort=RELEVANCE`;
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
    itemUrl: x.pipUrl,
    itemName: x.mainImageAlt ?? x.imageAlt,
    img: x.mainImageUrl,
    currentPrice: cleanPrice(x.salesPrice.current.wholeNumber),
    originalPrice: cleanPrice(x.salesPrice.previous?.wholeNumber),
    currency: x.salesPrice.currencyCode,
    discounted: Boolean(x.salesPrice.previous),
    inStock: x.onlineSellable
  };
}

function processIndex(json) {
  const requests = [];
  const { moreProducts } = json;
  const products = moreProducts.productWindow;
  for (const product of products) {
    const data = parseProduct(product);

    // ehnance product data from detail page
    requests.push({
      url: product.pipUrl,
      userData: { label: Label.Detail, product: data }
    });

    // enhance product variants data
    const { variants } = product.gprDescription;
    for (const variant of variants) {
      requests.push({
        url: variant.pipUrl,
        userData: {
          label: Label.Detail,
          product: Object.assign({}, data, {
            itemId: variant.itemNoGlobal,
            itemUrl: variant.pipUrl,
            itemName: variant.mainImageAlt ?? variant.imageAlt ?? data.itemName,
            img: variant.imageUrl ?? data.imageUrl,
            currentPrice: cleanPrice(variant.salesPrice.current?.wholeNumber),
            originalPrice: cleanPrice(
              variant.salesPrice?.previous?.wholeNumber
            ),
            currency: variant.salesPrice.currencyCode,
            discounted: Boolean(variant.salesPrice?.previous),
            inStock: variant.onlineSellable
          })
        }
      });
    }
  }
  return requests;
}

function processTotalCount(json, country) {
  const requests = [];
  const count = json.specialPage.productCount;
  const pages = Math.ceil(count / 100);
  for (let page = 1; page <= pages; page++) {
    requests.push({
      url: feedUrl(country, page),
      userData: { label: Label.Index }
    });
  }
  return requests;
}

/**
 * @param {Document} document
 */
function getCategory(document) {
  return Array.from(document.querySelectorAll(".bc-breadcrumb__list-item"))
    .map(el => el.innerText.trim())
    .join(" > ");
}

/**
 * @param {import("@crawlee/http").RequestOptions} request
 * @param {string | Buffer} body
 * @returns {Promise<*>}
 */
async function processDetail(request, body) {
  const { product } = request.userData;
  const document = html(body);
  const category = getCategory(document);
  Object.assign(product, { category });
  await Dataset.pushData(product);
  return product;
}

async function handleResponse({ request, body, json, requestQueue, country }) {
  log.debug("handling request", {
    url: request.url,
    label: request.userData.label
  });
  switch (request.userData.label) {
    case Label.Start: {
      const requests = processTotalCount(json, country);
      const { processedRequests, ...rest } = await requestQueue.addRequests(
        requests,
        {
          forefront: true
        }
      );
      return processedRequests.length;
    }
    case Label.Index: {
      const requests = processIndex(json);
      await requestQueue.addRequests(requests);
      return;
    }
    case Label.Detail:
      return processDetail(request, body);
  }
}

/**
 * @param {Type} type
 * @param {Stats} stats
 * @param {string} country
 */
function processResult(type, stats, country) {
  switch (type) {
    case Type.Test:
      return async (label, data) => {
        log.debug(label, data);
      };
    case Type.Daily:
      return async (label, data) => {
        switch (label) {
          case Label.Start:
            stats.add("totalItems", data);
            break;
          case Label.Detail:
            stats.inc("items");
            await Dataset.pushData(data);
            break;
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
          await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `ikea_${country}`);
        }
      };
  }
}

export async function main() {
  rollbar.init();

  const {
    maxRequestRetries,
    country = "cz",
    type = Type.Daily,
    testUrls = [testCategory]
  } = await getInput();

  if (process.env.DEBUG) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    items: 0,
    totalCount: 0,
    failed: 0
  });

  const processData = processResult(type, stats, country);

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    async requestHandler({ crawler, request, body, json }) {
      const { userData, url } = request;
      log.info(`processing request ${url}`);
      const result = await handleResponse({
        request,
        body,
        json,
        requestQueue: crawler.requestQueue,
        country
      });
      return processData(userData.label, result);
    },
    async failedRequestHandler({ request }, error) {
      stats.inc("failed");
      log.error(`failed request ${request.url}`, error);
    }
  });

  const sources =
    type === Type.Test
      ? testUrls
      : [{ url: startUrl(country), userData: { label: Label.Start } }];
  await crawler.run(sources);

  await Promise.all([stats.save(true), uploadToKeboola(`ikea_${country}`)]);

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
