import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { createRouter } from "./routes.js";
import { LABELS, COUNTRY } from "./const.js";
import { getTableName, getRootUrl } from "./tools.js";

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
      url: getRootUrl(),
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

    await uploadToKeboola(getTableName());
  }
  log.info("Finished.");
});
