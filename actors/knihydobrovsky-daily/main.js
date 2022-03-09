import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { handleStart, handleList, handleSubList } from "./src/routes.js";

const { log } = Apify.utils;

let stats = {};

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL",
    bfUrls = []
  } = input ?? {};

  const arrayHandledIds = await Apify.getValue("handledIds");
  const handledIds = new Set(arrayHandledIds);

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  Apify.events.on("persistState", async () => {
    log.info("persisting handledIds", handledIds);
    await Apify.setValue("handledIds", [...handledIds]);
  });

  const requestQueue = await Apify.openRequestQueue();
  if (type === "FULL") {
    await requestQueue.addRequest({
      url: "https://www.knihydobrovsky.cz/kategorie"
    });
    const requestList = [
      "https://www.knihydobrovsky.cz/e-knihy",
      "https://www.knihydobrovsky.cz/audioknihy",
      "https://www.knihydobrovsky.cz/hry",
      "https://www.knihydobrovsky.cz/papirnictvi",
      "https://www.knihydobrovsky.cz/darky"
    ];
    for (const list of requestList) {
      await requestQueue.addRequest({
        url: list,
        userData: {
          label: "SUBLIST"
        }
      });
    }
  } else if (type === "BF") {
    //await requestQueue.addRequest({
    //  url: "https://www.knihydobrovsky.cz/akce-a-slevy/detail/black-friday-prave-dnes"
    //});
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url,
        userData: {
          label: "SUBLIST"
        }
      });
    }
  } else if (type === "TEST") {
    // Navigate to https://www.example.com in Playwright with a POST request
    await requestQueue.addRequest({
      url: "https://www.knihydobrovsky.cz/detektivky-thrillery-a-horor?sort=2&currentPage=130",
      userData: {
        label: "LIST"
      }
    });
  }
  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    async handlePageFunction({ request, $ }) {
      const {
        url,
        userData: { label }
      } = request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(request, $, requestQueue, handledIds, s3, stats);
        case "SUBLIST":
          return handleSubList(request, $, requestQueue, stats);
        default:
          return handleStart(request, $, requestQueue, stats);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "knihydobrovsky.cz");
    log.info("invalidated Data CDN");

    try {
      await uploadToKeboola(
        type === "BF" ? "knihydobrovsky_cz_bf" : "knihydobrovsky_cz"
      );
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
});
