import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { createInitRequests } from "./tools";
import { createRouter } from "./routes";

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();

  // TODO: get rid of globals
  global.userInput = await Apify.getInput();
  const { country } = global.userInput;

  const requestQueue = await Apify.openRequestQueue();
  const sources = createInitRequests();
  const requestList = await Apify.openRequestList("start-categories", sources);

  global.s3 = new S3Client({ region: "eu-central-1" });

  const handledIds = (await Apify.getValue("HANDLED_PRODUCT_IDS")) || [];
  global.handledIdsSet = new Set(handledIds);

  Apify.events.on("persistState", async () => {
    await Apify.setValue("handledIds", [...global.handledIdsSet]);
  });

  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    requestList,
    proxyConfiguration,
    maxConcurrency: 20,
    useSessionPool: true,
    async handlePageFunction(context) {
      const { request } = context;
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${label}] - [${request.url}]`);
      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    async handleFailedRequestFunction({ request }) {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.allSettled([
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", `tchibo.${country}`),
    uploadToKeboola(`tchibo_${country === "com.tr" ? "tr" : country}`)
  ]);
  log.info("invalidated Data CDN");
  log.info("Finished.");
});
