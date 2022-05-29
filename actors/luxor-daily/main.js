import Apify from "apify";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { S3Client } from "@aws-sdk/client-s3";
import { gotScraping } from "got-scraping";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import cheerio from "cheerio";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const URL_API_START =
  //"https://www.luxor.cz/products/knihy?sort=price%3Aasc&only_in_stock=1";  // For case sort will be used
  //"https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1"; // Use root categories only
  "https://mw.luxor.cz/api/v1/categories?size=1000"; // Use all categories

const URL_TEMPLATE_CATEGORY =
  //"https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1";
  "https://mw.luxor.cz/api/v1/categories?size=1000";

const URL_IMAGE_BASE = "https://cdn.luxor.cz/";
const URL_FRONT = "https://luxor.cz";
const URL_SITEMAP = "https://www.luxor.cz/sitemap.xml";
const PRODUCTS_PER_PAGE = 24; // 24 is default NO products on page

const LABELS = {
  API_START: "API-START",
  API_LIST: "API-LIST",
  API_DETAIL: "API-DETAIL",

  /*
  FRONT_START: "FRONT-START",
  FRONT_LIST: "FRONT-LIST",
  FRONT_DETAIL: "FRONT-DETAIL",
  */

  SITEMAP_START: "SITEMAP-START",
  SITEMAP_LIST: "SITEMAP-LIST",

  TEST: "TEST"
};

const processedIds = new Set();
const { log } = Apify.utils;

function getProductUrl(page, productPerPage, slug) {
  return `https://mw.luxor.cz/api/v1/products?page=${page}&size=${productPerPage}&sort=revenue%3Adesc&filter%5Bcategory%5D=${slug}`;
}

/**
 * Handle API scraping start
 * @param context
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleAPIStart(context, stats, crawlContext) {
  const requestOptions = {
    url: URL_TEMPLATE_CATEGORY,
    proxyUrl: crawlContext.proxyConfiguration.newUrl(),
    responseType: "json"
  };
  const { body } = await gotScraping(requestOptions);

  stats.inc("requests");

  const categories = body.data;

  // First page for all categories
  const PAGE = 1;

  for (const category in categories) {
    const slug = categories[category].slug;

    stats.inc("categories");

    const req = {
      url: getProductUrl(PAGE, PRODUCTS_PER_PAGE, slug),
      userData: {
        label: LABELS.API_LIST,
        slug: slug,
        page: 1
      }
    };

    crawlContext.requestQueue.addRequest(req);

    if (crawlContext.testScraping) {
      log.info("Scraping test break");
      break;
    }
  }
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
  const requestResult = await gotScraping(requestOptions);

  stats.inc("requests");

  const { body } = requestResult;

  switch (requestResult.statusCode) {
    case 200:
      stats.inc("pages");
      break;

    default:
      stats.inc("failed");
      break;
  }

  const products = body.data;
  const productTotalCount = body.total_count;

  const requests = [];

  for (const productIx in products) {
    const imgPath = products[productIx].hasOwnProperty("images")
      ? products[productIx].images.length
        ? products[productIx].images[0].url
        : ""
      : "";

    let originalPrice = null;
    let currentPrice = null;
    let currency = "CZK";

    const priceList = products[productIx].current_variant_price_group;
    for (const priceIx in priceList) {
      switch (priceList[priceIx].type) {
        case "RECOMMENDED":
          originalPrice = priceList[priceIx].with_vat;
          currency = priceList[priceIx].currency;
          break;

        case "SALE":
          currentPrice = priceList[priceIx].with_vat;
          currency = priceList[priceIx].currency;
          break;
      }
    }

    const product = {
      itemId: products[productIx].id,
      itemUrl: `https://luxor.cz/product/${products[productIx].slug}`,
      itemName: products[productIx].title,

      currency,
      currentPrice,
      originalPrice,
      discounted: currentPrice < originalPrice,

      img: `${URL_IMAGE_BASE}${imgPath}`,
      inStock: products[productIx].in_stock,
      category: request.userData.slug

      /*
      May be useful later
      slug: request.userData.slug,
      author: products[productIx].author,
      publisher: products[productIx].publisher,
      prices: products[productIx].current_variant_price_group,
      page: request.userData.page,
      pageUrl: request.url,
      */

      //blackFriday: null
    };

    if (!crawlContext.processedIds.has(product.itemId)) {
      crawlContext.processedIds.add(product.itemId);

      if (crawlContext.development) {
        await Apify.pushData(product);
      } else {
        requests.push(
          Apify.pushData(product),
          uploadToS3v2(crawlContext.s3, product)
        );
      }

      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }

  /*
  For debug only
  log.info(
    `Found ${requests.length / 2} unique products, overall: ${
      stats.items
    } products,` +
      ` ${stats.itemsDuplicity} duplicits, ${stats.failed} failed,` +
      ` ${stats.categories} categories`
  );
  */

  // await all requests, so we don't end before they end
  await Promise.all(requests);

  /*
  Prepared code to request product detail if more product data will be needed
  const requestDetail = {
    url,
    userData: {
      label: LABELS.API_DETAIL,
      product
    }
  };

  crawlContext.requestQueue.addRequest(requestDetail);
  */

  // Do next page request
  const pageCount = Math.ceil(productTotalCount / PRODUCTS_PER_PAGE);

  log.info(
    "Current product page: " +
      request.userData.page +
      "/" +
      pageCount +
      " on slug " +
      request.userData.slug
  );

  if (request.userData.page * PRODUCTS_PER_PAGE > productTotalCount) {
    log.info("All pages done with slug " + request.userData.slug);
    return;
  }

  const pageNext = request.userData.page + 1;

  const req = {
    url: `https://mw.luxor.cz/api/v1/products?page=${pageNext}&size=${PRODUCTS_PER_PAGE}&sort=revenue%3Adesc&filter%5Bcategory%5D=${request.userData.slug}`,
    userData: {
      label: LABELS.API_LIST,
      page: pageNext,
      pageCount,
      slug: request.userData.slug,
      pageUrl: `https://luxor.cz/products/${request.userData.slug}?page=${pageNext}`,
      note: "NextPage"
    }
  };

  crawlContext.requestQueue.addRequest(req);
}

/**
 * Handle API product detail scraping
 * @param request
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
async function handleAPIDetail(request, stats, crawlContext) {
  const prices = request.userData.product.prices;

  // Log price only - prepared for casually need more product data
  for (const price in prices) {
    log.info(prices[price]);
  }
}

/**
 * Handle frontend product scraping start (unfinished code skelet only)
 * @param request
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
/*
async function handleFrontStart(request, stats, crawlContext) {
  const requestOptions = {
    url: URL_FRONT,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  const pageNext = 1;

  $(".fqo5ryo")
    .find(".fowumum")
    .each((ix, el) => {
      const url_slug = $(el).attr("href");

      if (url_slug.indexOf("/products") > -1) {
        const req = {
          url: URL_FRONT + url_slug,
          userData: {
            label: LABELS.FRONT_LIST,
            page: pageNext,
            slug: url_slug,
            pageUrl
          }
        };

        crawlContext.requestQueue.addRequest(req);
      }
    });
}
*/

/**
 * Handle frontend product list scraping (unfinished code skelet only)
 * @param request
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
/*
async function handleFrontList(request, stats, crawlContext) {
  log.debug("---\nhandleFrontList");
}
*/

/**
 * Handle frontend product detail scraping (unfinished code skelet only)
 * @param request
 * @param stats Statistics reference
 * @param crawlContext
 * @returns {Promise<void>}
 */
/*
async function handleFrontDetail(request, stats, crawlContext) {
  const product = {
    itemId: products[productIx].id,
    itemUrl: `https://luxor.cz/product/${products[productIx].slug}`,
    itemName: products[productIx].title,

    currency,
    currentPrice,
    originalPrice,
    discounted: currentPrice < originalPrice,

    img: `${URL_IMAGE_BASE}${imgPath}`,
    inStock: products[productIx].in_stock,
    category: request.userData.slug
  };
}
*/

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

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  $("sitemap").each((ix, el) => {
    const url = $(el).find("loc").html();
    if (url.indexOf("product") > -1) {
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

async function handleSitemapList(context, stats, crawlContext) {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  //const productIds = []; // for debug only

  $("url").each((ix, el) => {
    const productId = $(el)
      .find("loc")
      .text()
      .replace("https://www.luxor.cz/product/", "");

    if (!processedIds.has(productId)) {
      processedIds.add(productId);
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  });

  const { items, itemsDuplicity } = await stats.get();

  log.debug(`Items count in XML: ${items}, duplicity ${itemsDuplicity}`);
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
    development = true,
    type = ActorType.FULL, // FULL | TEST | COUNT
    maxConcurrency = 100,
    maxRequestRetries = 4,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  log.info("DEVELOPMENT: " + development);

  const testScraping = type === "TEST";

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

  switch (type) {
    // Scraping via API
    case ActorType.TEST:
    case ActorType.FULL:
      log.info("API_START");
      sources.push({
        url: URL_API_START,
        userData: {
          label: LABELS.API_START
        }
      });
      break;

    // Unfinished frontend scraping
    /*
    case LABELS.FRONT_START:
      log.info("FRONT_START");
      sources.push({
        url: URL_FRONT,
        userData: {
          label: LABELS.FRONT_START
        }
      });
      break;
    */

    // Product counter
    case ActorType.COUNT:
      log.info("SITEMAP_START");
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

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);

  const crawlContext = {
    requestQueue,
    development,
    testScraping,
    proxyConfiguration,
    processedIds,
    s3
  };

  //const crawler = new Apify.CheerioCrawler({
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
        case LABELS.TEST:
        case LABELS.API_START:
          return handleAPIStart(context, stats, crawlContext);
        case LABELS.API_LIST:
          return handleAPIList(context, stats, crawlContext);
        case LABELS.API_DETAIL:
          return handleAPIDetail(context, stats, crawlContext);

        /*
        case LABELS.FRONT_START:
          return handleFrontStart(context, stats, crawlContext);
        case LABELS.FRONT_LIST:
          return handleFrontList(context, stats, crawlContext);
        case LABELS.FRONT_DETAIL:
          return handleFrontDetail(context, stats, crawlContext);
        */

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
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();

  log.info("Crawler finished");

  await stats.save();

  // Probably not needed yet - called from persistState event
  // await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  //log.info(JSON.stringify(stats, null, 2));

  if (!development) {
    try {
      log.info("Calling upload");
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "luxor.cz");
      log.info("invalidated Data CDN");
      await uploadToKeboola("luxor_cz");
      log.info("upload to Keboola finished");
    } catch (e) {
      log.debug(e);
    }
  }
});
