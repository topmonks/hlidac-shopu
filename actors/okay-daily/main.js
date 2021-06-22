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

  // // const { startUrls } = await Apify.getInput();
  // const { test, mode } = await Apify.getInput();
  // // const requestList = await Apify.openRequestList('start-urls', startUrls);
  // const requestQueue = await Apify.openRequestQueue();
  // if (mode === "BF") {
  //   await requestQueue.addRequest({
  //     url: "https://www.okay.cz/blackfriday/",
  //     userData: { label: "BF" }
  //   });
  // } else {
  //   await requestQueue.addRequest({ url: "https://www.okay.cz/" });
  // }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  // const productList = [];
  let promiseList = [];
  const crawler = new Apify.CheerioCrawler({
    // requestList,
    requestQueue,
    proxyConfiguration,
    // useApifyProxy: true,
    // apifyProxyGroups: ["CZECH_LUMINATI"],
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
          // productList.push(product);
          if (!processedIds.has(product.itemId)) {
            processedIds.add(product.itemId);
            // const fileName = await s3FileName(product);
            promiseList.push(
              Apify.pushData(product),
              // upload JSON+LD data to CDN
              uploadToS3(
                s3,
                `okay.${country.toLowerCase()}`,
                `${product.itemId}`,
                "jsonld",
                toProduct(product, {})
              )
            );
            stats.items += 1;
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
      // todo
      if (promiseList > 80) {
        await Promise.all(promiseList);
        promiseList = [];
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats);
  log.info(JSON.stringify(stats));

  // if (!test) {
  //   // calling the keboola upload
  //   try {
  //     const env = await Apify.getEnv();
  //     const run = await Apify.call(
  //       "blackfriday/uploader",
  //       {
  //         datasetId: env.defaultDatasetId,
  //         upload: true,
  //         actRunId: env.actorRunId,
  //         blackFriday: mode === "BF",
  //         tableName: mode === "BF" ? "okay_cz_bf" : "okay_cz"
  //       },
  //       {
  //         waitSecs: 25
  //       }
  //     );
  //     console.log(`Keboola upload called: ${run.id}`);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //
  //   // stats page
  //   try {
  //     const env = await Apify.getEnv();
  //     const run = await Apify.callTask(
  //       "blackfriday/status-page-store",
  //       {
  //         datasetId: env.defaultDatasetId,
  //         name: mode === "BF" ? "okay_cz_bf" : "okay_cz"
  //       },
  //       {
  //         waitSecs: 25
  //       }
  //     );
  //     console.log(`stats upload called: ${run.id}`);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }

  log.info("ACTOR - Finished");
});
