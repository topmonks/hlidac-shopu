import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import { LABELS, MARKETS_URL, COOP_BOX_CATEGORY_POST } from "./src/const.js";
import {
  extractMainCategories,
  extractCategories,
  extractPages,
  extractItemDetails,
  extractItem,
  extractCoopBoxCategories,
  extractCoopBoxItems,
  extractCoopBoxPages
} from "./src/extractors.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const { log } = Apify.utils;

async function stats() {
  return (
    (await Apify.getValue("STATS")) || {
      markets: 0,
      items: 0
    }
  );
}

function pageFunction({ requestQueue, uniqueItemId, processedIds, s3 }) {
  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handler(context) {
    const { $, body, request, response } = context;
    const { label } = request.userData;
    log.debug(`Start scraping label: [${label}] url: [${request.url}]`);
    let requests = [];
    let item = null;
    let items = [];
    switch (label) {
      case LABELS.START:
        const bodyJson = JSON.parse(body);
        for (const market of bodyJson) {
          if (market.website && market.website.includes("http")) {
            await requestQueue.addRequest({
              url: market.website.includes("coop-box")
                ? "https://eshop.coop-box.cz/"
                : market.website,
              userData: {
                label: market.website.includes("coop-box")
                  ? LABELS.COOP_BOX
                  : LABELS.MARKET,
                marketTitle: market.title,
                marketId: market.id
              }
            });
          }
        }
        break;
      case LABELS.COOP_BOX:
        log.debug("COOP-BOX market");
        requests = extractCoopBoxCategories($, request);
        break;
      case LABELS.COOP_BOX_CATEGORY:
        await requestQueue.addRequest({
          method: "POST",
          url: request.url,
          payload: JSON.stringify(
            COOP_BOX_CATEGORY_POST(request.userData.sourceId, "PB_MENU")
          ),
          userData: {
            label: LABELS.COOP_BOX_CATEGORY_RESPONSE
          }
        });
        break;
      case LABELS.COOP_BOX_CATEGORY_RESPONSE:
        if (response.statusCode === 200) {
          requests = extractCoopBoxPages($, request);
          items = extractCoopBoxItems($, request);
        }
        break;
      case LABELS.COOP_BOX_NEXT_PAGE:
        await requestQueue.addRequest({
          method: "POST",
          url: request.url,
          payload: JSON.stringify(
            COOP_BOX_CATEGORY_POST(request.userData.sourceId)
          ),
          userData: {
            label: LABELS.COOP_BOX_NEXT_PAGE_RESPONSE
          }
        });
        break;
      case LABELS.COOP_BOX_NEXT_PAGE_RESPONSE:
        if (response.statusCode === 200) {
          requests = extractCoopBoxPages($, request);
          items = extractCoopBoxItems($, request);
        }
        break;
      case LABELS.MARKET:
        requests = extractMainCategories($, request);
        stats.markets++;
        log.debug(`Found ${requests.length} main categories`);
        break;
      case LABELS.MAIN_CATEGORY:
        requests = extractCategories($, request);
        log.debug(`Found ${requests.length} categories`);
        break;
      case LABELS.CATEGORY:
        requests = extractPages($, request);
        requests = requests.concat(extractItemDetails($, request));
        break;
      case LABELS.DETAIL:
        item = extractItem($, request);
        stats.items++;
        await processItem({ item, processedIds, s3 });
        await Apify.utils.sleep(1000);
        break;
    }
    for (const r of requests) {
      await requestQueue.addRequest(r, { forefront: true });
    }
    for (const i of items) {
      if (!uniqueItemId.has(i.itemId)) {
        uniqueItemId.add(i.itemId);
        await Apify.pushData(i);
      }
    }
  }
  return handler;
}

async function processItem({ item, processedIds, s3 }) {
  // we don't need to block pushes, we will await them all at the end
  if (!processedIds.has(item.itemId)) {
    processedIds.add(item.itemId);
    const product = {
      ...item,
      category: ""
    };
    await Apify.pushData(item);
    await uploadToS3v2(s3, product, { priceCurrency: "CZK" });
  }
}

Apify.main(async () => {
  rollbar.init();

  const uniqueItemId = new Set();
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  log.info("ACTOR - start");
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  await requestQueue.addRequest({
    url: MARKETS_URL,
    userData: {
      label: "START"
    }
  });

  log.info("ACTOR - setUp crawler");
  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    requestTimeoutSecs: 60,
    handlePageFunction: pageFunction({
      requestQueue,
      uniqueItemId,
      processedIds,
      s3
    }),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("ACTOR - run crawler");
  // Run crawler.
  await crawler.run();

  log.info("ACTOR - crawler end");

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "e-coop.cz");
    log.info("invalidated Data CDN");
    //await uploadToKeboola("coop_cz");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
});
