const Apify = require("apify");
const retry = require("async-retry");
const cheerio = require("cheerio");

const { getCategoryRequests } = require("./utils");

const { handleCategory } = require("./routes");

const {
  utils: { log, requestAsBrowser }
} = Apify;

Apify.main(async () => {
  const { country } = await Apify.getInput();

  let productCount = (await Apify.getValue("COUNT")) || 0;
  Apify.events.on("migrating", () => {
    Apify.setValue("COUNT", productCount).then(() =>
      log.info("[PRODUCT COUNT] Saved")
    ).catch((error) => {
      log.error(`[ERROR]: ${error.message.toString()}`)
    });
  });

  setInterval(async () => {
    log.info(`[PRODUCT COUNT] ${productCount}`);
    await Apify.setValue("COUNT", productCount);
  }, 20 * 1000);

  // sitemap available here: https://www.ikea.com/sitemaps/sitemap.xml
  let sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
  switch (country) {
    case "cz":
      sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
      break;
    case "sk":
      sitemap = "https://www.ikea.com/sitemaps/cat-sk-SK_1.xml";
      break;
    case "hu":
      sitemap = "https://www.ikea.com/sitemaps/cat-hu-HU_1.xml";
      break;
    case "pl":
      sitemap = "https://www.ikea.com/sitemaps/cat-pl-PL_1.xml";
      break;
    case "de":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-DE_1.xml";
      break;
    case "at":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-AT_1.xml";
      break;
    default:
      throw new Error(`The scraper does not support ${country} country`);
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["BUYPROXIES94952"]
  });
  // Categories are quickly added to a RequestList
  const categoryRequests = await retry(
    async () => {
      // if anything throws, we retry
      const response = await requestAsBrowser({
        url: sitemap,
        proxyUrl: proxyConfiguration.newUrl()
      });
      const $ = cheerio.load(response.body);
      const categories = getCategoryRequests($);
      log.info(`[START]: found ${categories.length} categories --- ${sitemap}`);
      return categories;
    },
    {
      retries: 10
    }
  );

  const requestList = await Apify.openRequestList(
    "CATEGORY_REQUESTS",
    categoryRequests
  );
  const requestQueue = await Apify.openRequestQueue();

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 35,
    handlePageTimeoutSecs: 240,
    requestTimeoutSecs: 180,
    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "CATEGORY":
          productCount += await handleCategory(context);
          break;
        default:
          throw new Error(`No route for label: ${label}`);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  await Apify.pushData({ numberOfProducts: productCount });
  log.info("Crawl finished.");
});
