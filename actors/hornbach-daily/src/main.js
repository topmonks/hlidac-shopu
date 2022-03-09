import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { createRouter } from "./routes";
import { LABELS } from "./const";

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  global.userInput = await Apify.getInput();
  const { country = "cz" } = global.userInput;
  const requestQueue = await Apify.openRequestQueue();
  if (country === "cz") {
    await requestQueue.addRequest({
      url: "https://www.hornbach.cz/SitemapShop_category_cs_1.xml",
      userData: {
        label: LABELS.SITE
      }
    });
  } else {
    await requestQueue.addRequest({
      url: "https://www.hornbach.sk/SitemapShop_category_sk_1.xml",
      userData: {
        label: LABELS.SITE
      }
    });
  }

  global.s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  // Set up the crawler, passing a single options object as an argument.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 20,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;

      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `hornbach.${country}`);
  log.info("invalidated Data CDN");

  await uploadToKeboola(`hornbach_${country}`);
  log.info("Finished.");
});
