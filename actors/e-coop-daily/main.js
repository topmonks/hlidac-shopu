const Apify = require("apify");
const { load } = require("cheerio");
const extractor = require("./src/extractors");

const { LABELS, MARKETS_URL, COOP_BOX_CATEGORY_POST } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

const stats = async () => {
  return (
    (await Apify.getValue("STATS")) || {
      markets: 0,
      items: 0
    }
  );
};
const uniqueItemId = new Set();

/**
 * Creates Page Function for scraping
 * @param {RequestQueue} requestQueue
 * @param {S3Client} s3
 * @returns {CheerioHandlePage}
 */
function pageFunction(requestQueue) {
  const processedIds = new Set();

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handler(context) {
    const { $, body, contentType, request, response } = context;
    const { label, category, currentPage } = request.userData;
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
            //break;
          }
        }
        break;
      case LABELS.COOP_BOX:
        log.debug("COOP-BOX market");
        requests = extractor.extractCoopBoxCategories($, request);
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
          requests = extractor.extractCoopBoxPages($, request);
          items = extractor.extractCoopBoxItems($, request);
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
          requests = extractor.extractCoopBoxPages($, request);
          items = extractor.extractCoopBoxItems($, request);
        }
        break;
      case LABELS.MARKET:
        requests = extractor.extractMainCategories($, request);
        stats.markets++;
        log.debug(`Found ${requests.length} main categories`);
        break;
      case LABELS.MAIN_CATEGORY:
        requests = extractor.extractCategories($, request);
        log.debug(`Found ${requests.length} categories`);
        break;
      case LABELS.CATEGORY:
        requests = extractor.extractPages($, request);
        requests = requests.concat(extractor.extractItemDetails($, request));
        break;
      case LABELS.DETAIL:
        item = extractor.extractItem($, request);
        stats.items++;
        await Apify.pushData(item);
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

Apify.main(async () => {
  log.info("ACTOR - start");
  const input = await Apify.getInput();
  const {
    development,
    maxRequestRetries = 1,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  if (development) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: false
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
    handlePageFunction: pageFunction(requestQueue),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("ACTOR - run crawler");
  // Run crawler.
  await crawler.run();

  log.info("ACTOR - crawler end");
  // stats page
  try {
    const env = await Apify.getEnv();
    const run = await Apify.callTask(
      "blackfriday/status-page-store",
      {
        datasetId: env.defaultDatasetId,
        name: "coop-cz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Keboola upload called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }

  try {
    const env = await Apify.getEnv();
    const run = await Apify.call(
      "blackfriday/uploader",
      {
        datasetId: env.defaultDatasetId,
        upload: true,
        actRunId: env.actorRunId,
        tableName: "coop_cz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Keboola upload called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }
  log.info("ACTOR - Finished");
});
