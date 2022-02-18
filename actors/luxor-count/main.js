const Apify = require("apify");

const { handleStart, handleList, handleDetail } = require("./src/routes");

let stats = {};

const { URL_SITEMAP } = require("./src/const");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const {
    development = true,
    maxConcurrency = 100,
    maxRequestRetries = 3,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  let sources = [];
  sources.push({
    url: URL_SITEMAP,
    userData: {
      label: "START"
    }
  });

  if (development) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawlContext = {
    requestQueue,
    development,
    stats,
    proxyConfiguration
  };

  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    maxRequestRetries,
    maxConcurrency,
    handleRequestFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, stats, crawlContext);
        case "DETAIL":
          return handleDetail(context, crawlContext);
        default:
          return handleStart(context, crawlContext);
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

  console.log(JSON.stringify(stats, null, 2));
});
