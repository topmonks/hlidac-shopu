const Apify = require("apify");
//const { S3Client } = require("@aws-sdk/client-s3");
//const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

/*
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
*/

//const { URL } = require("url");

const {
  handleStart,
  handleCategory,
  handleList,
  handleDetail
} = require("./src/routes");

const { URL_MAIN } = require("./src/const");

const { log } = Apify.utils;

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    development = true,
    maxConcurrency = 1,
    maxRequestRetries = 1
  } = input ?? {};
  let sources = [];
  sources.push({
    url: URL_MAIN,
    userData: {
      label: "START"
    }
  });

  if (development) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);

  //const proxyConfiguration = await Apify.createProxyConfiguration();

  //const crawler = new Apify.CheerioCrawler({
  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    //proxyConfiguration,
    maxRequestRetries,
    maxConcurrency: development ? 1 : maxConcurrency,
    //handlePageFunction: async context => {
    handleRequestFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      context.requestQueue = requestQueue;
      log.info("Page opened.", { label, url });
      switch (label) {
        //case "CATEGORY":
        //  return handleCategory(context);
        case "LIST":
          return handleList(context);
        case "DETAIL":
          return handleDetail(context);
        default:
          return handleStart(context);
      }
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed ${maxRequestRetries} times`);
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
});
