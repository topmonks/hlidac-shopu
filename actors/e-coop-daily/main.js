const Apify = require("apify");
const { load } = require("cheerio");
const extractor = require("./src/extractors");

const { LABELS, MARKETS_URL, COOP_BOX_CATEGORY_POST } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

Apify.main(async () => {
  log.info("ACTOR - start");
  const { development = false } = await Apify.getInput();
  if (development) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const stats = (await Apify.getValue("STATS")) || {
    markets: 0,
    items: 0
  };
  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration();

  const marketsRequest = await requestAsBrowser({
    url: MARKETS_URL,
    proxyUrl: proxyConfiguration.newUrl(),
    json: true
  });
  if (marketsRequest.statusCode === 200) {
    const { body } = marketsRequest;
    for (const market of body) {
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
  }
  log.info("ACTOR - setUp crawler");
  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const uniqueItemId = new Set();
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxRequestRetries: 10,
    proxyConfiguration,
    handlePageFunction: async ({ request, $ }) => {
      const { label } = request.userData;
      log.debug(`Start scraping label: [${label}] url: [${request.url}]`);
      let requests = [];
      let item = null;
      let items = [];
      let response = null;
      switch (label) {
        case LABELS.COOP_BOX:
          log.debug("COOP-BOX market");
          requests = extractor.extractCoopBoxCategories($, request);
          break;
        case LABELS.COOP_BOX_CATEGORY:
          response = await requestAsBrowser({
            method: "POST",
            url: request.url,
            proxyUrl: proxyConfiguration.newUrl(),
            payload: JSON.stringify(
              COOP_BOX_CATEGORY_POST(request.userData.sourceId, "PB_MENU")
            )
          });
          if (response.statusCode === 200) {
            const { body } = response;
            $ = load(body);
            requests = extractor.extractCoopBoxPages($, request);
            items = extractor.extractCoopBoxItems($, request);
          }
          break;
        case LABELS.COOP_BOX_NEXT_PAGE:
          response = await requestAsBrowser({
            method: "POST",
            url: request.url,
            proxyUrl: proxyConfiguration.newUrl(),
            payload: JSON.stringify(
              COOP_BOX_CATEGORY_POST(request.userData.sourceId)
            )
          });
          if (response.statusCode === 200) {
            const { body } = response;
            $ = load(body);
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
