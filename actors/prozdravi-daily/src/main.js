const { S3Client } = require("@aws-sdk/client-s3");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { LABELS, PRODUCTS_URLS } = require("./const");
const { createRouter } = require("./routes");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const randomUA = require("modern-random-ua");

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  global.s3 = new S3Client({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const { test = false, debugLog = false, type } = input;
  global.test = test;
  global.type = type;
  const requestQueue = await Apify.openRequestQueue();
  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  if (type === LABELS.BF) {
    await requestQueue.addRequest({
      url: PRODUCTS_URLS.BF_PRODUCTS_PAGE,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.START
      }
    });
  } else {
    await requestQueue.addRequest({
      url: PRODUCTS_URLS.PRODUCTS_PAGE,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.START
      }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency: 10,
    proxyConfiguration,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${label}] - [${request.url}]`);
      await router(label, context);
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "prozdravi.cz");
  log.info("invalidated Data CDN");
  if (!test) {
    let tableName = "prozdravi_cz";
    if (type === "BF") {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR finished");
});
