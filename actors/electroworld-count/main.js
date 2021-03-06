const Apify = require("apify");
const { fetchPage } = require("./src/crawler");
const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  const startUrls = [
    "https://www.electroworld.cz/smart-inteligentni-domacnost",
    "https://www.electroworld.cz/televize-foto-audio-video",
    "https://www.electroworld.cz/mobily-notebooky-tablety-pc-gaming",
    "https://www.electroworld.cz/velke-spotrebice-chladnicky-pracky",
    "https://www.electroworld.cz/male-spotrebice-vysavace-kavovary",
    "https://www.electroworld.cz/zahrada-dum-sport-hobby"
  ];

  const proxyConfiguration = await Apify.createProxyConfiguration();
  const requestQueue = await Apify.openRequestQueue();
  const crawlContext = {
    requestQueue: requestQueue,
    productCount: 0,
    errors: 0
  };

  for (let i = 0; i < startUrls.length; i++) {
    await requestQueue.addRequest({ url: startUrls[i] });
  }

  const crawler = new Apify.CheerioCrawler({
    requestQueue: requestQueue,
    proxyConfiguration: proxyConfiguration,
    // maxConcurrency: 50,
    handlePageFunction: async context => {
      await fetchPage(context, crawlContext);
    }
  });

  log.info("Starting product count.");

  await crawler.run();

  log.info(
    `Found ${crawlContext.productCount} products. ` +
      `Unable to get product number from ${crawlContext.errors} pages.`
  );
});
