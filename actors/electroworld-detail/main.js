const Apify = require("apify");
const { RequestList } = require("apify");
const { fetchPage } = require("./src/scraper");

Apify.main(async () => {
  const input = (await Apify.getInput()) || {};
  const {
    detailURLs = [
      "https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy",
      "https://www.electroworld.cz/nine-eagles-galaxy-visitor-3",
      "https://www.electroworld.cz/samsung-galaxy-a52-128-gb-cerna"
    ]
  } = input;

  const proxyConfiguration = await Apify.createProxyConfiguration();
  const dataset = await Apify.openDataset();
  const requestList = new RequestList({ sources: detailURLs });
  await requestList.initialize();

  const crawler = new Apify.CheerioCrawler({
    requestList: requestList,
    proxyConfiguration: proxyConfiguration,
    maxConcurrency: 50,
    handlePageFunction: async context => {
      await fetchPage(context.$, context.request, dataset);
    }
  });

  await crawler.run();
});
