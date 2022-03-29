import Apify from "apify";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { S3Client } from "@aws-sdk/client-s3";
import { gotScraping } from "got-scraping";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import cheerio from "cheerio";

import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";

// There is problem with stat dependency on command line
// Not possible to update library with stats for unknown reason
// import { withPersistedStats } from "../common/stats.js";

export const URL_MAIN = "https://www.conrad.cz";
export const URL_CATEGORY = "https://www.conrad.cz/restservices/CZ/megamenu";
export const URL_SITEMAP = "https://www.conrad.cz/sitemap.xml";
export const PRODUCTS_PER_PAGE = 30;

const LABELS = {
  API_START: "API-START",
  API_LIST: "API-LIST",
  API_DETAIL: "API-DETAIL",

  SITEMAP_START: "SITEMAP-START",
  SITEMAP_LIST: "SITEMAP-LIST",

  TEST: "TEST" // FIXME: use ActorType.TEST
};

const { log } = Apify.utils;

async function getApiKey(stats) {
  const requestOptions = {
    url: URL_MAIN
  };

  stats.inc("requests");

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body);

  const globals = $("script#globals").html();

  const matchX = globals.match(/apiKey: '(.*)',/);

  if (matchX) {
    return matchX[1];
  } else {
    return false;
  }
}

async function traverseCategory(crawlContext, category, stats) {
  const categoryUrl = category.url;
  const categoryId = categoryUrl.split("-").pop();
  const categoryTitle = category.title;

  log.info("Adding category " + categoryId + " " + categoryTitle);

  const req = {
    url: `https://api.conrad.com/search/1/v3/facetSearch/CZ/cs/b2c?apikey=${crawlContext.apiKey}`,
    userData: {
      categoryId,
      categoryUrl,
      categoryTitle,
      apiKey: crawlContext.apiKey,
      label: LABELS.API_LIST,
      page: 1
    },
    uniqueKey: Math.random().toString()
  };

  await crawlContext.requestQueue.addRequest(req);

  stats.inc("categoriesParsed");

  if (category.hasOwnProperty("children")) {
    if (category.children.length) {
      for (let childIx in category.children) {
        await traverseCategory(crawlContext, category.children[childIx], stats);
      }
    }
  }
}

async function traverseCategoryStart(crawlContext, stats) {
  const requestOptions = {
    url: URL_CATEGORY,
    responseType: "json"
  };

  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }

  stats.inc("requests");

  const { body } = await gotScraping(requestOptions);
  const categories = body.body;

  for (let categoryIx in categories) {
    await traverseCategory(crawlContext, categories[categoryIx], stats);
  }
}

/**
 * Handle API scraping start
 * @param context
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleAPIStart(context, stats, crawlContext) {
  const apiKey = await getApiKey(stats);
  if (!apiKey) {
    log.error("Cannot found apiKey");
    return;
  }

  log.info(`apiKey ${apiKey}`);

  crawlContext.apiKey = apiKey;

  await traverseCategoryStart(crawlContext, stats);
}

/**
 * Handle API product list scraping
 * @param context
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleAPIList(context, stats, crawlContext) {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "json"
  };

  const requests = [];

  if (crawlContext.debug) {
    log.info("Processing category " + request.userData.categoryTitle);
  }

  stats.inc("categories");
  let requestPayload = request.userData.json
    ? {
        json: request.userData.json
      }
    : {
        json: {
          "facetFilter": [],
          "from": 0,
          "globalFilter": [
            {
              "field": "categoryId",
              "type": "TERM_OR",
              "values": [request.userData.categoryId]
            }
          ],
          "query": "",
          "size": PRODUCTS_PER_PAGE,
          "sort": [
            {
              "field": "price",
              "order": "asc"
            }
          ],
          "disabledFeatures": ["FIRST_LEVEL_CATEGORIES_ONLY"],
          "enabledFeatures": ["and_filters"]
        }
      };

  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }

  const response = await gotScraping.post(requestOptions, requestPayload);

  const { body } = response;

  // Update product count
  if (requestPayload.json.from < body.meta.total) {
    stats.inc("requests");

    const productsIds = body.hits.map(({ productId }) => productId);
    const productParamList = "&id=" + productsIds.join("&id=");

    // Can be useful
    // const breadcrumbs = body.meta.breadcrumb.map(({ name }) => name);

    // BTW: There is not used literal template, because Lint is crazy from it
    // and it show error - productParamList is undefined
    const requestPrice = {
      url:
        "https://www.conrad.cz/restservices/CZ/products/pricesAndAvailabilities?net=false" +
        productParamList,
      proxyUrl: crawlContext.proxyConfiguration.newUrl(),
      responseType: "json"
    };

    const priceResponse = await gotScraping.get(requestPrice);
    const productsPrices = priceResponse.body.body;

    const productsPricesMap = new Map();
    for (const ix in productsPrices) {
      productsPricesMap.set(productsPrices[ix].id, productsPrices[ix]);
    }

    const requestDetail = {
      url: `https://www.conrad.cz/restservices/CZ/products/products?${productParamList}`,
      responseType: "json"
    };

    const detailResponse = await gotScraping.get(requestDetail);
    const productsDetails = detailResponse.body.body;

    const productsDetailsMap = new Map();
    for (const ix in productsDetails) {
      productsDetailsMap.set(productsDetails[ix].id, productsDetails[ix]);
    }

    for (const ix in productsIds) {
      if (!crawlContext.processedIds.has(productsIds[ix])) {
        crawlContext.processedIds.add(productsIds[ix]);

        // There are two requests needed (price & detail), because price do not containe urlPath
        // and product name. Set with productId is try to avoid to finding key from first array
        // (set) in second array
        const detail = productsDetailsMap.get(productsIds[ix]);
        const price = productsPricesMap.get(productsIds[ix]);

        if (detail.hasOwnProperty("urlPath") && price.hasOwnProperty("price")) {
          const product = {
            itemId: productsIds[ix],
            itemUrl: detail.urlPath,
            itemName: detail.title,
            img: detail.image?.url,
            discounted:
              price.price.crossedOut?.gross &&
              price.price.unit.gross < price.price.crossedOut.gross,
            originalPrice: price.price.crossedOut?.gross,
            currency: price.price.currency,
            currentPrice: price.price.unit.gross, // gross | net
            inStock: detail.availability.inStockArticle,
            vatPercentage: price.price.vatPercentage
          };

          stats.inc("items");

          requests.push(
            Apify.pushData(product),
            uploadToS3v2(crawlContext.s3, product)
          );

          await Promise.allSettled(requests);
        } else {
          stats.inc("missingUrl");
        }
      } else {
        stats.inc("itemsDuplicity");
      }
    }

    if (crawlContext.debug) {
      log.info(
        "Product offset " +
          requestPayload.json.from +
          " [" +
          request.userData.categoryTitle +
          "]"
      );
    }

    requestPayload.json.from += PRODUCTS_PER_PAGE;

    await crawlContext.requestQueue.addRequest(
      {
        url: request.url,
        userData: {
          label: LABELS.API_LIST,
          categoryTitle: request.userData.categoryTitle,
          json: requestPayload.json
        },
        uniqueKey: Math.random().toString()
      },
      {
        forefront: true
      }
    );

    stats.inc("pages");
  } else {
    log.info("LAST PRODUCT IN CATEGORY");
  }
}

/**
 * Start sitemap parsing
 * @param context
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleSitemapStart(context, stats, crawlContext) {
  log.info("Downloading " + URL_SITEMAP);

  const requestOptions = {
    url: URL_SITEMAP,
    responseType: "text"
  };

  stats.inc("requests");

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  $("sitemap").each((ix, el) => {
    const url = $(el).find("loc").html();
    if (url.indexOf("products") > -1) {
      const req = {
        url,
        userData: {
          label: LABELS.SITEMAP_LIST
        }
      };

      crawlContext.requestQueue.addRequest(req);
    }
  });
}

/**
 * Parsing sitemap list
 * @param context
 * @param stats
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleSitemapList(context, stats, crawlContext) {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "text"
  };

  stats.inc("requests");

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  $("url").each((ix, el) => {
    const productId = $(el).find("loc").text().split("-").pop();

    if (!processedIds.has(productId)) {
      processedIds.add(productId);
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  });
}

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const detailUrl = defAtom(null);
  const processedIds = new Set();

  const input = await Apify.getInput();
  const {
    development = false,
    debug = true,
    type = LABELS.API_START, // API_START | SITEMAP_START
    maxConcurrency = 100,
    maxRequestRetries = 8,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  const testScraping = type === "TEST";

  log.info("DEVELOPMENT: " + development);
  log.info("DEBUG: " + debug);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    categoriesParsed: 0,
    requests: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0,
    missingUrl: 0
  });

  let sources = [];

  log.info("Type " + type);

  switch (type) {
    // Scraping via API
    case LABELS.API_START:
      sources.push({
        url: URL_MAIN,
        userData: {
          label: LABELS.API_START
        }
      });
      break;

    // Product counter
    case LABELS.SITEMAP_START:
      sources.push({
        url: URL_SITEMAP,
        userData: {
          label: LABELS.SITEMAP_START
        }
      });
      break;

    // Test scraping via API
    case LABELS.TEST:
      sources.push({
        url: URL_MAIN,
        userData: {
          label: LABELS.API_START
        }
      });
      break;
  }

  if (debug || development) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);

  const crawlContext = {
    requestQueue,
    development,
    debug,
    testScraping,
    proxyConfiguration,
    processedIds,
    s3
  };

  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    maxRequestRetries,
    maxConcurrency,
    handleRequestFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info(
        `Page ${context.request.url} opened ${JSON.stringify(
          context.request.userData
        )}`
      );
      switch (label) {
        case LABELS.API_START:
        case LABELS.TEST:
          return await handleAPIStart(context, stats, crawlContext);
        case LABELS.API_LIST:
          return await handleAPIList(context, stats, crawlContext);

        case LABELS.SITEMAP_START:
          return await handleSitemapStart(context, stats, crawlContext);
        case LABELS.SITEMAP_LIST:
          return await handleSitemapList(context, stats, crawlContext);

        default:
          log.error("Unknown label " + label);
      }
    },

    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed ${maxRequestRetries} times`);
      stats.inc("failed");
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();

  if (!development) {
    await Promise.allSettled([
      stats.save(),
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(detailUrl.deref())),
      uploadToKeboola(shopName(detailUrl.deref()))
    ]);
  }

  log.info("Crawler finished");
});
