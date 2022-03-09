import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { createInitRequests } from "./tools.js";
import { createRouter } from "./routes.js";
import { LABELS, BF } from "./const.js";

const { log } = Apify.utils;

global.processedIds = new Set();

Apify.main(async () => {
  rollbar.init();
  global.input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 5,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = global.input ?? {};
  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  global.stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  let sources = [];
  if (type !== BF) {
    sources = createInitRequests();
  } else {
    sources.push({
      url: "https://www.lidl.cz/c/black-friday/a10010065",
      userData: {
        label: LABELS.LIDL_SHOP_CAT,
        level: 1
      }
    });
  }
  const requestList = await Apify.openRequestList("start-categories", sources);

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
    requestList,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    requestTimeoutSecs: 600,
    handlePageTimeoutSecs: 600,
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
      log.info(`Request ${request.url} failed ${maxRequestRetries} times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `lidl.cz`);
    log.info("invalidated Data CDN");

    await uploadToKeboola(type !== BF ? "lidl_cz" : "lidl_cz_bf");
  }

  log.info("Finished.");
});
