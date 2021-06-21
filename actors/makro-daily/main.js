// const { S3Client } = require("@aws-sdk/client-s3");
// const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN
  // toProduct,
  // uploadToS3,
  // s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const Apify = require("apify");
const {
  utils: { log }
} = Apify;
const { handleStart, handleList, handlePage } = require("./src/routes");

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  log.info("ACTOR - start");

  // rollbar.init();
  // const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  // const { mode } = await Apify.getInput();
  const input = await Apify.getInput();
  const {
    debug = false,
    development = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0
  };

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    // apifyProxyGroups: ["CZECH_LUMINATI"],
    groups: proxyGroups
  });

  await requestQueue.addRequest({
    url: "https://sortiment.makro.cz/",
    userData: {
      label: "START"
    }
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxConcurrency,
    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      context.requestQueue = requestQueue;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, stats, input);
        case "PAGE":
          return handlePage(context, stats, processedIds);
        default:
          return handleStart(context, stats, input);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  // if (!mode) {
  //   const env = await Apify.getEnv();
  //   try {
  //     const run = await Apify.callTask(
  //       "blackfriday/status-page-store",
  //       {
  //         datasetId: env.defaultDatasetId,
  //         name: "makro-cz"
  //       },
  //       {
  //         waitSecs: 25
  //       }
  //     );
  //     console.log(`Status upload called: ${run.id}`);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //
  //   try {
  //     const run = await Apify.call(
  //       "blackfriday/uploader",
  //       {
  //         datasetId: env.defaultDatasetId,
  //         upload: true,
  //         actRunId: env.actorRunId,
  //         blackFriday: false,
  //         tableName: "makro_cz"
  //       },
  //       {
  //         waitSecs: 25
  //       }
  //     );
  //     console.log(`Keboola upload called: ${run.id}`);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }

  log.info("ACTOR - Finished");
});
