const Apify = require("apify");
const { handleStart, handleList, handleDetail } = require("./src/routes");

const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  // const { startUrls } = await Apify.getInput();
  const startUrls = "https://www.kasa.cz/";
  // const state = {productCount: 0}; Tohle by byl problem, kdyby actor migroval, nezapamatoval by si cislo z uz proslych stranek
  // proto mám toto: state si bud nactu z KVS kdyz tam je a kdyz ne, tak je 0, resp. { productCount: 0}
  const state = (await Apify.getValue("STATE")) || { productCount: 0 };
  // definovana funkce, ktera kazdou minutu nebo pri migraci ulozi hodnoty do KVS
  const persistState = async () => {
    await Apify.setValue("STATE", state);
  };
  Apify.events.on("persistState", persistState);

  // const requestList = await Apify.openRequestList('start-urls', startUrls);
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({ url: startUrls });

  const crawler = new Apify.CheerioCrawler({
    // requestList,
    requestQueue,
    // useApifyProxy: true,
    // useSessionPool: true,
    // persistCookiesPerSession: true,
    // Be nice to the websites.
    // Remove to unleash full power.
    maxConcurrency: 50,
    // You can remove this if you won't
    // be scraping any JSON endpoints.
    // additionalMimeTypes: [
    //     'application/json',
    // ],
    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      context.state = state;
      switch (label) {
        case "LIST":
          return handleList(context);
        case "DETAIL":
          return handleDetail(context);
        default:
          return handleStart(context);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
  // tady pro jistotu volam persistate, aby se mi tam ulozila posledni hodnota
  await persistState();
  console.log(`we have found ${state.productCount} items in this shop`);
  // await Apify.pushData({products: state.productCount});
});
