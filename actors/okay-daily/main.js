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
  handleBFListing
} = require("./src/routes");

const {
  COUNTRY,
  BASE_URL_CZ,
  BASE_URL_SK,
  BASE_URL_CZ_BF,
  BASE_URL_SK_BF
} = require("./src/consts");

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

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
    maxConcurrency = 5
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
  if (type === "BF") {
    const bfUrl = country === COUNTRY.CZ ? BASE_URL_CZ_BF : BASE_URL_SK_BF;
    await requestQueue.addRequest({
      url: bfUrl,
      userData: { label: "BF" }
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
      log.info("Page opened.", { label, url });
      context.requestQueue = requestQueue;
      switch (label) {
        case "LIST":
          await handleList(context, stats, development);
          break;
        case "DETAIL":
          const product = await handleDetail(context, stats, country);
          stats.totalItems += 1;
          if (!processedIds.has(product.itemId)) {
            processedIds.add(product.itemId);
            promiseList.push(
              Apify.pushData(product),
              uploadToS3(
                s3,
                `okay.${country.toLowerCase()}`,
                `${product.itemId}`,
                "jsonld",
                toProduct(product, {})
              )
            );
            stats.items += 1;
            if (promiseList.length > 90) {
              await Promise.all(promiseList);
              promiseList = [];
            }
          } else {
            stats.itemsDuplicity += 1;
          }
          break;
        case "BF":
          await handleBFListing(context, stats, development);
          break;
        default:
          await handleStart(context, stats, development);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats);
  log.info(JSON.stringify(stats));

  await invalidateCDN(
    cloudfront,
    "EQYSHWUECAQC9",
    `okay.${country.toLowerCase()}`
  );
  log.info("invalidated Data CDN");

  if (!development) {
    const tableName = `okay_${country.toLowerCase()}${
      type === "BF" ? "_bf" : ""
    }`;
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR - Finished");
});
