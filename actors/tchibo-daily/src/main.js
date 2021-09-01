const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const tools = require("./tools");
const { createRouter } = require("./routes");
const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  global.userInput = await Apify.getInput();
  const { country } = global.userInput;

  const requestQueue = await Apify.openRequestQueue();
  const sources = tools.createInitRequests();
  const requestList = await Apify.openRequestList("start-categories", sources);

  global.s3 = new S3Client({ region: "eu-central-1" });

  const handledIds = (await Apify.getValue("HANDLED_PRODUCT_IDS")) || [];
  global.handledIdsSet = new Set(handledIds);

  Apify.events.on("persistState", async () => {
    await Apify.setValue("handledIds", [...global.handledIdsSet]);
  });

  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    requestList,
    proxyConfiguration,
    maxConcurrency: 20,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${label}] - [${request.url}]`);
      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `tchibo.${country}`);
  log.info("invalidated Data CDN");

  await uploadToKeboola(`tchibo_${country === "com.tr" ? "tr" : country}`);
  log.info("Finished.");
});
