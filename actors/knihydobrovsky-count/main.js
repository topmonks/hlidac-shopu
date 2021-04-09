const Apify = require("apify");
const { handleStart, handleList, handleSubList } = require("./src/routes");

const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  const input = await Apify.getInput();
  const { development, maxConcurrency = 10, proxyGroups = ["CZECH_LUMINATI"] } =
    input ?? {};

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("categories", [
    {
      url: "https://www.knihydobrovsky.cz/kategorie"
    },
    {
      url: "https://www.knihydobrovsky.cz/e-knihy",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/audioknihy",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/hry",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/papirnictvi",
      userData: { label: "SUBLIST" }
    },
    {
      url: "https://www.knihydobrovsky.cz/darky",
      userData: { label: "SUBLIST" }
    }
  ]);

  const categoryCount = {};

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, categoryCount, requestQueue);
        case "SUBLIST":
          return handleSubList(context, requestQueue);
        default:
          return handleStart(context, requestQueue);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
  log.info("kategorie", categoryCount);
  const totalCount = Object.values(categoryCount)
    .map(x => parseInt(x, 10))
    .filter(Boolean)
    .reduce((acc, x) => acc + x, 0);
  await Apify.pushData({ totalCount });
});
