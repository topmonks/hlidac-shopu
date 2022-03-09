import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { LABELS, PRODUCTS_URLS } from "./const.js";
import { createRouter } from "./routes.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import randomUA from "modern-random-ua";

const { log } = Apify.utils;

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  global.s3 = new S3Client({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    test = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};
  global.test = test;
  global.type = type;
  const requestQueue = await Apify.openRequestQueue();
  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };

  const crawlContext = {
    development,
    processedIds,
    stats
  };

  const persistState = async () => {
    await Apify.setValue("STATS", crawlContext.stats).then(() =>
      log.debug("STATS saved!")
    );
    log.info(JSON.stringify(crawlContext.stats));
  };
  Apify.events.on("persistState", persistState);

  if (type === LABELS.BF) {
    await requestQueue.addRequest({
      url: PRODUCTS_URLS.BF_PRODUCTS_PAGE,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.START
      }
    });
  } else {
    for (const categoryUrl of PRODUCTS_URLS.PRODUCTS_PAGE) {
      await requestQueue.addRequest({
        url: categoryUrl,
        headers: {
          userAgent: randomUA.generate()
        },
        userData: {
          label: LABELS.START
        }
      });
    }
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  // Create route
  const router = createRouter();

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    proxyConfiguration,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${label}] - [${request.url}]`);
      await router(label, context, request.url, crawlContext);
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  log.info("Crawl finished.");

  await Apify.setValue("STATS", crawlContext.stats);
  log.info(JSON.stringify(crawlContext.stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "prozdravi.cz");
    log.info("invalidated Data CDN");

    let tableName = "prozdravi_cz";
    if (type === "BF") {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR finished");
});
