const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const { createRouter } = require("./routes");
const { LABELS, COUNTRY, BF } = require("./const");
const tools = require("./tools");
const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  global.userInput = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    country = COUNTRY.CZ,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = global.userInput ?? {};
  const requestQueue = await Apify.openRequestQueue();
  if (type === "FULL") {
    await requestQueue.addRequest({
      url: tools.getRootUrl(),
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: "https://www.dek.cz/produkty/vypis/13321-kamna-a-krby",
      userData: {
        label: LABELS.CATEGORY
      }
    });
  }

  global.s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  // Create route
  const router = createRouter();

  // Set up the crawler, passing a single options object as an argument.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    proxyConfiguration,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        url,
        userData: { label }
      } = request;
      log.info(`Scraping [${label}] - ${url}`);

      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `dek.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    await uploadToKeboola(tools.getTableName());
  }
  log.info("Finished.");
});
