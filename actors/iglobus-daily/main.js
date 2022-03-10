import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { handleStart, handleList } from "./routes.js";

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  let stats = {};
  const processedIds = new Set();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 50,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  const requestQueue = await Apify.openRequestQueue();

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0
  };

  const crawlContext = {
    requestQueue,
    development,
    stats,
    processedIds
  };

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  await requestQueue.addRequest({ url: "https://www.iglobus.cz" });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency: development ? 1 : maxConcurrency,

    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, crawlContext);
        default:
          return handleStart(context, crawlContext);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "iglobus.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola("globus_cz");
    log.info("upload to Keboola finished");
  }
  log.info("Finished.");
});
