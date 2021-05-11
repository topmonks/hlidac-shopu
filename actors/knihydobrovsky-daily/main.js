const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { S3Client } = require("@aws-sdk/client-s3");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const { handleStart, handleList, handleSubList } = require("./src/routes");

const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const { development, maxConcurrency = 10, proxyGroups = ["CZECH_LUMINATI"] } =
    input ?? {};

  const arrayHandledIds = await Apify.getValue("handledIds");
  const handledIds = new Set(arrayHandledIds);

  Apify.events.on("persistState", async () => {
    log.info("persisting handledIds", handledIds);
    await Apify.setValue("handledIds", [...handledIds]);
  });

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("categories", [
    {
      url: "https://www.knihydobrovsky.cz/kategorie"
    },
    {
      url: "https://www.knihydobrovsky.cz/e-knihy",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/audioknihy",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/hry",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/papirnictvi",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/darky",
      userData: { label: "SUBLIST" }
    }
  ]);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    async handlePageFunction(context) {
      const { request } = context;
      const {
        url,
        userData: { label }
      } = request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, requestQueue, handledIds, s3);
        case "SUBLIST":
          return handleSubList(context, requestQueue);
        default:
          return handleStart(context, requestQueue);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "knihydobrovsky.cz");
  log.info("invalidated Data CDN");

  try {
    await uploadToKeboola("knihydobrovsky_cz");
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
