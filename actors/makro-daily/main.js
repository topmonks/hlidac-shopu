const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
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

  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

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

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "makro.cz");
  log.info("invalidated Data CDN");

  if (!development) {
    await uploadToKeboola("makro_cz");
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR - Finished");
});
