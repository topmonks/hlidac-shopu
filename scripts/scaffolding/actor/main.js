import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN,
  currencyToISO4217
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { URL, URLSearchParams } from "url";
import { gotScraping } from "got-scraping";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";

const { log } = Apify.utils;

const COUNTRY = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  DE: "DE",
  AT: "AT"
};

const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY"
};

function getCountrySlug(country) {
  switch (country.toUpperCase()) {
    case COUNTRY.CZ:
      return "cs-cz";
    case COUNTRY.SK:
      return "sk-sk";
    case COUNTRY.HU:
      return "hu-hu";
    case COUNTRY.DE:
      return "de-de";
    case COUNTRY.AT:
      return "de-at";
  }
}

function makeListingUrl(
  countryCode,
  productQuery,
  currentPage,
  pageSize = 100
) {
  throw new Error("Not implemented");
  // return `https://product-search.services.dmtech.com/${countryCode.toLowerCase()}/search/static?${new URLSearchParams(
  //   {
  //     ...productQuery,
  //     pageSize,
  //     currentPage,
  //     sort: "price_asc",
  //     type: "search-static"
  //   }
  // )}`;
}

function createProductUrl(country, url) {
  throw new Error("Not implemented");
  switch (country.toUpperCase()) {
    case COUNTRY.SK:
      return new URL(url, "https://exampla.sk").href;
    default:
      return new URL(url, `https://example.${country.toLowerCase()}`).href;
  }
}

function* traverseCategories(categories, names = []) {
  for (const category of categories) {
    if (category.children) {
      yield* traverseCategories(category.children, [...names, category.title]);
    } else {
      names = [...names, category.title];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
  }
}

function parseItem(p, country, category) {
  throw new Error("Not implemented");
  // return {
  //   itemId:
  //   itemName:
  //   itemUrl:
  //   img:
  //   inStock:
  //   currentPrice:
  //   originalPrice:
  //   currency:
  //   category,
  //   discounted:
  // };
}

async function handleProducts(
  body,
  stats,
  requestQueue,
  country,
  productQuery,
  category,
  processedIds,
  s3,
  request,
  detailUrl
) {
  throw new Error("Not implemented");
  // const { products, currentPage, totalPages } = body;
  // // we don't need to block pushes, we will await them all at the end
  // const requests = [];
  // stats.add("items", products.length);
  // if (products.length > 0) {
  //   if (currentPage === 0 && totalPages > 1) {
  //     for (let i = 1; i < totalPages; i++) {
  //       // we need to await here to prevent higher categories
  //       // to be enqueued sooner than sub-categories
  //       await requestQueue.addRequest(
  //         {
  //           url: makeListingUrl(country, productQuery, i),
  //           userData: {
  //             country,
  //             category
  //           }
  //         },
  //         { forefront: true }
  //       );
  //     }
  //   }
  //   for (const item of products) {
  //     if (!processedIds.has(item.gtin)) {
  //       processedIds.add(item.gtin);
  //       stats.inc("itemsUnique");
  //       const detail = parseItem(item, country, category);
  //       if (!detailUrl.deref()) detailUrl.reset(detail.itemUrl);

  //       requests.push(
  //         // push data to dataset to be ready for upload to Keboola
  //         Apify.pushData(detail),
  //         // upload JSON+LD data to CDN
  //         uploadToS3v2(s3, detail, {
  //           brand: item.brandName,
  //           name: item.name,
  //           gtin: item.gtin
  //         })
  //       );
  //     } else {
  //       stats.inc("itemsDuplicity");
  //     }
  //   }
  //   log.debug(`Found ${requests.length / 2} unique products at ${request.url}`);

  //   // await all requests, so we don't end before they end
  //   await Promise.allSettled(requests);
  // }
}

async function handleCategory(body, requestQueue, country, category) {
  throw new Error("Not implemented");
  // const { mainData } = body;
  // const result = mainData
  //   .filter(x => x.query)
  //   .map(x => x.query.query)
  //   .shift();

  // if (result) {
  //   let tempProductQuery = {};
  //   const resultValue = result.split(":")[3];
  //   if (result.includes(":allCategories") && resultValue) {
  //     tempProductQuery = { "allCategories.id": resultValue };
  //   } else if (result.includes(":brand") && resultValue) {
  //     const brand = resultValue.split("|")[0];
  //     tempProductQuery = { "brandName": brand };
  //   }
  //   await requestQueue.addRequest({
  //     url: makeListingUrl(country, tempProductQuery, 0),
  //     userData: {
  //       country,
  //       category,
  //       productQuery: tempProductQuery
  //     }
  //   });
  // }
}

async function handleStart(type, navigation, stats, requestQueue, country) {
  throw new Error("Not implemented");
  log.info("Pagination info", type);
  const { children } = navigation;
  // we are traversing recursively from leaves to trunk
  for (const category of traverseCategories(children)) {
    log.debug(`Found category ${category.title} at link: ${category.link}`);
    stats.inc("categories");
    // we need to await here to prevent higher categories
    // to be enqueued sooner than sub-categories
    //   await requestQueue.addRequest({
    //     url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
    //       country
    //     )}${category.link}/?json`,
    //     userData: {
    //       country,
    //       category: category.breadcrumbs.toString(),
    //       label: LABELS.CATEGORY
    //     }
    //   });
  }
}

async function enqueInitialRequest(type, requestQueue, country) {
  throw new Error("Not implemented");
  if (type === ActorType.FULL) {
    //   await requestQueue.addRequest({
    //     url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
    //       country
    //     )}/?view=navigation&json`,
    //     userData: {
    //       country,
    //       productQuery: "",
    //       label: LABELS.START
    //     }
    //   });
  } else if (type === ActorType.TEST) {
    //   const productQuery = { "brandName": "SEINZ." };
    //   await requestQueue.addRequest({
    //     url: makeListingUrl(country, productQuery, 0),
    //     userData: {
    //       country,
    //       category: "test > test",
    //       categoryId: "020800"
    //     }
    //   });
  }
}

Apify.main(async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });
  const processedIds = new Set();
  const detailUrl = defAtom(null);

  const input = await Apify.getInput();
  const {
    debug = false,
    country = COUNTRY.CZ,
    type = ActorType.FULL
  } = input ?? {};

  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  await enqueInitialRequest(type, requestQueue, country);

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 1,
    async handleRequestFunction(context) {
      const { request } = context;
      const {
        url,
        userData: { country, label, category, productQuery }
      } = request;
      const response = await gotScraping({
        responseType: "json",
        url
      });
      const { statusCode, body } = response;
      if (statusCode !== 200) {
        return log.info(body.toString());
      }

      const { type, navigation } = body;
      switch (label) {
        case LABELS.START:
          return await handleStart(
            type,
            navigation,
            stats,
            requestQueue,
            country
          );
        case LABELS.CATEGORY:
          return await handleCategory(body, requestQueue, country, category);
        default:
          return await handleProducts(
            body,
            stats,
            requestQueue,
            country,
            productQuery,
            category,
            processedIds,
            s3,
            request,
            detailUrl
          );
      }
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.allSettled([
    stats.save(),
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(detailUrl.deref())),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);

  log.info("invalidated Data CDN");
  log.info("Finished.");
});
