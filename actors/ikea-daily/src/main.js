const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const retry = require("async-retry");
const cheerio = require("cheerio");

const {
  handleSitemap,
  handleCategory,
  handleList,
  handleDetail
} = require("./routes");

const { getCategoryRequests } = require("./utils");

const {
  utils: { log, requestAsBrowser }
} = Apify;

let productCount = 0;

Apify.main(async () => {
  rollbar.init();
  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 35,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = "DAILY"
  } = input ?? {};
  global.country = country;

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

  global.s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const requestQueue = await Apify.openRequestQueue();

  if (type === "DAILY") {
    await requestQueue.addRequest({
      url: sitemap,
      userData: {
        label: "SITEMAP"
      }
    });
  } else if (type === "COUNT") {
    productCount = (await Apify.getValue("COUNT")) || 0;
    Apify.events.on("migrating", () => {
      Apify.setValue("COUNT", productCount)
        .then(() => log.info("[PRODUCT COUNT] Saved"))
        .catch(error => {
          log.error(`[ERROR]: ${error.message.toString()}`);
        });
    });

    setInterval(async () => {
      log.info(`[PRODUCT COUNT] ${productCount}`);
      await Apify.setValue("COUNT", productCount);
    }, 20 * 1000);

    // Categories are added to requestQue
    const categoryRequests = await retry(
      async () => {
        // if anything throws, we retry
        const response = await requestAsBrowser({
          url: sitemap,
          proxyUrl: proxyConfiguration.newUrl()
        });
        const $ = cheerio.load(response.body);
        const categories = getCategoryRequests($);
        log.info(
          `[START]: found ${categories.length} categories --- ${sitemap}`
        );
        return categories;
      },
      {
        retries: 10
      }
    );

    for (const item of categoryRequests) {
      await requestQueue.addRequest(item);
    }
  }

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    handlePageTimeoutSecs: 240,
    requestTimeoutSecs: 180,
    handlePageFunction: async context => {
      const {
        url,
        userData: { label, productData }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "SITEMAP":
          return handleSitemap(context);
        case "CATEGORY":
          const handleCategoryResult = await handleCategory(
            context,
            countryPath,
            type
          );
          if (type === "DAILY") {
            return handleCategoryResult;
          } else if (type === "COUNT") {
            productCount += handleCategoryResult;
          }
          return;
        case "LIST":
          return handleList(context);
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

  if (type === "DAILY") {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `ikea.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    await uploadToKeboola(`ikea_${country.toLowerCase()}`);
  } else if (type === "COUNT") {
    await Apify.pushData({ numberOfProducts: productCount });
  }

  log.info("Finished.");
});
