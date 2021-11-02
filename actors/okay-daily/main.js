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
const {
  handleStart,
  handleList,
  handleDetail,
  handleStartSK,
  handleListSK
} = require("./src/routes");

const { COUNTRY, BASE_URL_CZ, BASE_URL_SK } = require("./src/consts");
const { URL } = require("url");

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
    bfUrls = []
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

  const crawlContext = {
    baseUrl: country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK,
    development,
    stats,
    country
  };

  const requestQueue = await Apify.openRequestQueue();
  if (type === "BF") {
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url,
        userData: { label: "LIST" }
      });
      crawlContext.stats.urls += 1;
    }
  } else if (development && crawlContext.country === COUNTRY.SK) {
    await requestQueue.addRequest({
      url: "https://www.okay.sk/moderne-koberce/",
      userData: { label: "LIST" }
    });
  } else {
    const rootUrl = country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK;
    await requestQueue.addRequest({ url: rootUrl });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  let promiseList = [];
  const crawler = new Apify.CheerioCrawler({
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
      switch (label) {
        case "LIST":
          switch (country.toUpperCase()) {
            case COUNTRY.SK:
              await handleListSK(context, crawlContext);
              break;
            default:
              await handleList(context, crawlContext);
          }
          break;
        case "DETAIL":
          const product = await handleDetail(context, crawlContext, country);
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
          switch (country.toUpperCase()) {
            case COUNTRY.SK:
              await handleStartSK(context, crawlContext);
              break;
            default:
              await handleStart(context, crawlContext);
          }
      }
    }
  });

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
    await uploadToKeboola(tableName);
    log.info(`upload to Keboola finished: ${tableName}`);
  }

  log.info("ACTOR - Finished");
});
