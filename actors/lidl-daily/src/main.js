const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const tools = require("./tools");
const { createRouter } = require("./routes");
const { LABELS, MAIN_URL } = require("./const");
const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  global.userInput = await Apify.getInput();

  const requestQueue = await Apify.openRequestQueue();
  const sources = tools.createInitRequests();
  const requestList = await Apify.openRequestList("start-categories", sources);

  global.s3 = new S3Client({ region: "eu-central-1" });

  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  // Set up the crawler, passing a single options object as an argument.
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
      log.info(`Processing: [${request.url}]`);
      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `lidl.cz`);
  log.info("invalidated Data CDN");

  await uploadToKeboola("lidl_cz");
  log.info("Finished.");
});
