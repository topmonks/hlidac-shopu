import Apify from "apify";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { S3Client } from "@aws-sdk/client-s3";
import { gotScraping } from "got-scraping";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import cheerio from "cheerio";

import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

// There is problem with stat dependency on command line
// Not possible to update library with stats for unknown reason
// import { withPersistedStats } from "../common/stats.js";

export const URL_MAIN = "https://www.conrad.cz";

export const URL_CATEGORY = "https://www.conrad.cz/restservices/CZ/megamenu";

export const URL_SITEMAP = "https://www.conrad.cz/sitemap.xml";

export const PRODUCTS_PER_PAGE = 30;

export const LABELS = {
  API_START: "API-START",
  API_LIST: "API-LIST",
  API_DETAIL: "API-DETAIL",

  SITEMAP_START: "SITEMAP-START",
  SITEMAP_LIST: "SITEMAP-LIST"
};

const processedIds = new Set();
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
  const categoryId = category.url.split("-").pop();

  const req = {
    url: `https://api.conrad.com/search/1/v3/facetSearch/CZ/cs/b2c?apikey=${crawlContext.apiKey}`,
    userData: {
      categoryId,
      apiKey: crawlContext.apiKey,
      label: LABELS.API_LIST,
      page: 1
    }
  };

  await crawlContext.requestQueue.addRequest(req);

  stats.inc("categories");

  if (category.hasOwnProperty("children") && category.children.length) {
    for (let childIx in category.children) {
      await traverseCategory(crawlContext, category.children[childIx], stats);
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

  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }

  let productOffset = 0;
  let productCount = PRODUCTS_PER_PAGE;

  do {
    const requestPayload = {
      json: {
        "facetFilter": [],
        "from": productOffset,
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

    const { body } = await gotScraping.post(requestOptions, requestPayload);

    stats.inc("requests");

    // Update product count
    productCount = body.meta.total;

    const products = body.hits.map(({ productId, image, isBuyable }) => {
      return { productId, isBuyable, image };
    });

    const productsIds = products.map(({ productId }) => productId);

    const productList = "&id=" + productsIds.join("&id=");

    // Can be useful
    // const breadcrumbs = body.meta.breadcrumb.map(({ name }) => name);

    const requestPrice = {
      url:
        "https://www.conrad.cz/restservices/CZ/products/pricesAndAvailabilities?net=false" +
        productList,
      responseType: "json"
    };

    stats.inc("requests");

    const priceResponse = await gotScraping.get(requestPrice);
    const productsPrices = priceResponse.body.body;

    const productsPricesMap = new Map();
    for (const ix in productsPrices) {
      productsPricesMap.set(productsPrices[ix].id, productsPrices[ix]);
    }

    const requestDetail = {
      url: `https://www.conrad.cz/restservices/CZ/products/products?id=${productList}`,
      responseType: "json"
    };

    stats.inc("requests");

    const detailResponse = await gotScraping.get(requestDetail);
    const productsDetails = detailResponse.body.body;

    const productsDetailsMap = new Map();
    for (const ix in productsDetails) {
      productsDetailsMap.set(productsDetails[ix].id, productsDetails[ix]);
    }

    for (const ix in productsIds) {
      if (!crawlContext.processedIds.has(productsIds[ix])) {
        crawlContext.processedIds.add(productsIds[ix]);
        stats.inc("items");

        const detail = productsDetailsMap.get(productsIds[ix]);
        const price = productsPricesMap.get(productsIds[ix]);

        const req = {
          url: URL_MAIN + detail.urlPath,
          userData: {
            label: LABELS.API_DETAIL,
            product: {
              itemId: productsIds[ix],
              itemUrl: detail.urlPath,
              itemName: detail.title,
              img: detail.image?.url,
              //discounted:
              //originalPrice:
              currency: price.price.currency,
              currentPrice: price.price.unit.gross, // gross | net
              inStock: detail.availability.inStockArticle,
              vatPercentage: price.price.vatPercentage
            }
          }
        };

        await crawlContext.requestQueue.addRequest(req);
      } else {
        stats.inc("itemsDuplicity");
      }
    }

    productOffset += PRODUCTS_PER_PAGE;

    log.info("Product offset " + productOffset + "/" + productCount);
  } while (productOffset < productCount);
}

/**
 * Handle API product detail scraping
 * @param context
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleAPIDetail(context, stats, crawlContext) {
  const { request } = context;

  const product = request.userData.product;

  stats.inc("items");

  crawlContext.requests.set(
    Apify.pushData(product),
    uploadToS3v2(crawlContext.s3, product)
  );
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
    } else {
      console.log("Skipped", url);
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
    const productId = $(el).find("loc").text();

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

  const input = await Apify.getInput();
  const {
    development = true,
    type = LABELS.API_START, // API_START | SITEMAP_START
    maxConcurrency = 100,
    maxRequestRetries = 4,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  log.info("DEVELOPMENT: " + development);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    requests: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0,
    itemsTest: 0,
    itemsDuplicityTest: 0
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
  }

  if (development) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);
  const requests = new Map();

  const crawlContext = {
    requestQueue,
    development,
    proxyConfiguration,
    processedIds,
    s3,
    requests
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
      log.debug("Page opened.", { label, url });
      switch (label) {
        case LABELS.API_START:
          return handleAPIStart(context, stats, crawlContext);
        case LABELS.API_LIST:
          return handleAPIList(context, stats, crawlContext);
        case LABELS.API_DETAIL:
          return handleAPIDetail(context, stats, crawlContext);

        case LABELS.SITEMAP_START:
          return handleSitemapStart(context, stats, crawlContext);
        case LABELS.SITEMAP_LIST:
          return handleSitemapList(context, stats, crawlContext);

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

  await Promise.allSettled(crawlContext.requests);
  await stats.save();

  if (!development) {
    log.info("Calling upload");
    await Promise.allSettled([
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", "conrad.cz"),
      await uploadToKeboola("conrad_cz")
    ]);
    log.info("Invalidated Data CDN, upload to Keboola finished");
  }

  log.info("Crawler finished");
});
