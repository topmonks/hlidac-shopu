import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { handleStart, handleList, handlePage } from "./src/routes.js";

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

Apify.main(async function main() {
  log.info("ACTOR - start");

  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

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
          return handlePage(context, stats, processedIds, s3);
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
