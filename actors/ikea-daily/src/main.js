const Apify = require("apify");
const retry = require("async-retry");
const cheerio = require("cheerio");

const { getCategoryRequests } = require("./utils");

const { handleCategory, handleList, handleDetail } = require("./routes");

const {
  utils: { log, requestAsBrowser }
} = Apify;

Apify.main(async () => {
  const { country } = await Apify.getInput();

  // sitemap available here: https://www.ikea.com/sitemaps/sitemap.xml
  let sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
  let countryPath = "cz/cs";
  switch (country) {
    case "cz":
      sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
      countryPath = "cz/cs";
      break;
    case "sk":
      sitemap = "https://www.ikea.com/sitemaps/cat-sk-SK_1.xml";
      countryPath = "sk/sk";
      break;
    case "hu":
      sitemap = "https://www.ikea.com/sitemaps/cat-hu-HU_1.xml";
      countryPath = "hu/hu";
      break;
    case "pl":
      sitemap = "https://www.ikea.com/sitemaps/cat-pl-PL_1.xml";
      countryPath = "pl/pl";
      break;
    case "de":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-DE_1.xml";
      countryPath = "de/de";
      break;
    case "at":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-AT_1.xml";
      countryPath = "at/de";
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
        userData: { label, productData }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "CATEGORY":
          return handleCategory(context, requestQueue, countryPath);
        case "LIST":
          return handleList(context, requestQueue);
        case "DETAIL":
          return handleDetail(context, productData);
        default:
          throw new Error(`No route for label: ${label}`);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
});
