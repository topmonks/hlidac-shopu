const Apify = require("apify");
const { migrationConfig, getOrIncStatsValue } = require("./tools");
const {
  handleMainPage,
  handleCategory,
  handleProductList
} = require("./routes.js");
const {
  LABELS,
  START_REQUESTS,
  ACTOR_TYPES,
  CATEGORY_LIST_ITEM_SELECTOR,
  CATEGORY_CELL_SELECTOR
} = require("./consts.js");

const { MAIN_PAGE, CATEGORY_OR_PRODUCTS } = LABELS;

const { COUNT, DAILY } = ACTOR_TYPES;

const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  const {
    maxConcurrency = 100,
    proxyCountryCode,
    maxRequestsPerCrawl,
    type
  } = (await Apify.getInput()) || {};

  if (type !== COUNT && type !== DAILY) {
    log.error('type input value has to be either "COUNT" or "DAILY"');
    return;
  }

  const requestList = await Apify.openRequestList("start-url", START_REQUESTS);
  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    countryCode: proxyCountryCode
  });

  if (type === COUNT) {
    await migrationConfig();
  }

  const crawler = new Apify.CheerioCrawler({
    additionalMimeTypes: ["application/octet-stream"],
    requestList,
    requestQueue,
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries: 5,
    handlePageTimeoutSecs: 120,
    requestTimeoutSecs: 120,
    autoscaledPoolOptions: {
      maxConcurrency
    },
    maxRequestsPerCrawl,
    handlePageFunction: async context => {
      const {
        request: {
          userData: { label }
        },
        $
      } = context;

      // log.info('Page opened.', { label, url });
      switch (label) {
        case MAIN_PAGE:
          await handleMainPage.handleMainPage(context);
          break;
        case CATEGORY_OR_PRODUCTS: {
          if ($(CATEGORY_CELL_SELECTOR).length) {
            await handleCategory.handleCategory(context);
            break;
          } else if (!$(CATEGORY_LIST_ITEM_SELECTOR).length) {
            // If there is no category list at all then we skip the page
            break;
          } else {
            await handleProductList.handleProductList({
              ...context,
              type
            });
            break;
          }
        }

        default:
          break;
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      const debugDataSet = await Apify.openDataset("debug-rozetka-count-daily");
      await debugDataSet.pushData({
        "#debug": Apify.utils.createRequestDebugInfo(request)
      });
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  if (type === COUNT) {
    await Apify.pushData({ totalCount: await getOrIncStatsValue() });
  }
});
