const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const Apify = require("apify");
const { handleStart, handleList, handleDetail } = require("./src/routes");

const { COUNTRY, BASE_URL_CZ, BASE_URL_SK } = require("./src/consts");
const { URL } = require("url");
const cheerio = require("cheerio");

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

function s3FileNameSync(detail) {
  const url = new URL(detail.itemUrl);
  return url.pathname.match(/\/([^/]+)/)?.[1];
}

Apify.main(async () => {
  log.info("ACTOR - start");

  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = "FULL",
    debug = false,
    development = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5,
    maxRequestRetries = 3,
    bfUrls = [],
    customTableName = null
  } = input ?? {};
  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  const crawlContext = {
    requestQueue,
    baseUrl: country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK,
    development,
    stats,
    country
  };

  if (type === "BF") {
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url,
        userData: { label: "LIST" }
      });
      crawlContext.stats.urls += 1;
    }
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: "https://www.okay.cz/tv-s-uhloprickou-55-139-cm/",
      userData: { label: "LIST" }
    });
  } else {
    const rootUrl = country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK;
    await requestQueue.addRequest({
      url: rootUrl,
      userData: { label: "START" }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  let promiseList = [];
  const crawler = new Apify.PlaywrightCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    navigationTimeoutSecs: 120,
    handlePageTimeoutSecs: 600,
    launchContext: {
      useChrome: true,
      launchOptions: {
        headless: !development
      }
    },
    handlePageFunction: async context => {
      const { request, response, page } = context;
      const {
        url,
        userData: { label }
      } = request;
      if (label === "START") {
        await page.waitForSelector("li.nav-nested__link-parent");
      } else {
        await page.waitForLoadState("networkidle", { timeout: 0 });
      }
      //await page.waitForSelector(".product-box__price-bundle");
      //await page.waitForSelector("ul.pagination");
      const body = await page.content();
      const $ = cheerio.load(body);
      switch (label) {
        case "LIST":
          await handleList($, crawlContext);
          break;
        case "DETAIL":
          const product = await handleDetail($, crawlContext, country);
          if (product.itemId !== null && product.currentPrice !== null) {
            crawlContext.stats.totalItems += 1;
            if (!processedIds.has(product.itemId)) {
              processedIds.add(product.itemId);
              promiseList.push(
                Apify.pushData(product),
                uploadToS3(
                  s3,
                  `okay.${country.toLowerCase()}`,
                  s3FileNameSync(product),
                  "jsonld",
                  toProduct(product, {})
                )
              );
              crawlContext.stats.items += 1;
              if (promiseList.length >= 100) {
                await Promise.all(promiseList);
                promiseList = [];
              }
            } else {
              crawlContext.stats.itemsDuplicity += 1;
            }
          }
          break;
        default:
          await handleStart($, crawlContext);
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      stats.failed++;
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });
  /*  const crawler = new Apify.CheerioCrawler({
      requestQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      maxConcurrency,
      handlePageTimeoutSecs: 600,
      handlePageFunction: async context => {
        const {
          url,
          userData: { label }
        } = context.request;
        log.debug("Page opened.", { label, url });
        context.requestQueue = requestQueue;
      }
    });*/

  log.info("Starting the crawl.");
  await crawler.run();
  if (promiseList.length > 0) {
    await Promise.all(promiseList);
    promiseList = [];
  }
  log.info("Crawl finished.");

  await Apify.setValue("STATS", crawlContext.stats);
  log.info(JSON.stringify(crawlContext.stats));

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `okay.${country.toLowerCase()}`
    );
    log.info(`invalidated Data CDN: okay.${country.toLowerCase()}`);

    const tableName = `okay_${country.toLowerCase()}${
      type === "BF" ? "_bf" : ""
    }`;
    await uploadToKeboola(customTableName ? customTableName : tableName);
    log.info(`upload to Keboola finished: ${tableName}`);
  }

  log.info("ACTOR - Finished");
});
