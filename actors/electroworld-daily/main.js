const Apify = require("apify");
const { fetchPage, countProducts } = require("./src/crawler");
const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  const input = (await Apify.getInput()) || {};
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL",
    startUrls = [
      "https://www.electroworld.cz/smart-inteligentni-domacnost",
      "https://www.electroworld.cz/televize-foto-audio-video",
      "https://www.electroworld.cz/mobily-notebooky-tablety-pc-gaming",
      "https://www.electroworld.cz/velke-spotrebice-chladnicky-pracky",
      "https://www.electroworld.cz/male-spotrebice-vysavace-kavovary",
      "https://www.electroworld.cz/zahrada-dum-sport-hobby"
    ]
  } = input;

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const dataset = await Apify.openDataset();
  const requestQueue = await Apify.openRequestQueue();
  const crawlContext = {
    requestQueue: requestQueue,
    dataset: dataset,
    stats,
    processedIds
  };

  if (type === "COUNT") {
    await countProducts(stats);
  } else if (type === "FULL") {
    for (let i = 0; i < startUrls.length; i++) {
      await requestQueue.addRequest({ url: startUrls[i] });
    }
  }

  const crawler = new Apify.CheerioCrawler({
    requestQueue: requestQueue,
    proxyConfiguration: proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    handlePageFunction: async context => {
      await fetchPage(context, crawlContext);
    }
  });

  log.info("Starting the crawl.");

  await crawler.run();

  console.log("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  log.info(
    `Found ${crawlContext.stats.categories} subcategory pages and ${crawlContext.stats.pages} ` +
      `product list pages in total; scraped ${crawlContext.stats.items} products.`
  );
});
