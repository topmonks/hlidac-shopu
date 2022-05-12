import Apify from "apify";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { getOrIncStatsValue, migrationConfig } from "./tools.js";
import { handleCategory, handleMainPage, handleProductList } from "./routes.js";

import {
  ACTOR_TYPES,
  CATEGORY_CELL_SELECTOR,
  CATEGORY_LIST_ITEM_SELECTOR,
  LABELS,
  START_REQUESTS
} from "./consts.js";

const { MAIN_PAGE, CATEGORY_OR_PRODUCTS } = LABELS;

const { COUNT, DAILY } = ACTOR_TYPES;

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

Apify.main(async function main() {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  };
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "UA",
    proxyCountryCode,
    type = "DAILY"
  } = input ?? {};

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
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    persistCookiesPerSession: true,
    handlePageTimeoutSecs: 120,
    requestTimeoutSecs: 120,
    autoscaledPoolOptions: {
      maxConcurrency
    },
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
              type,
              stats,
              processedIds
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
  // Run crawler
  await crawler.run();
  log.info("ACTOR - crawler end");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "rozetka.com.ua");
    log.info("invalidated Data CDN");
    await uploadToKeboola("rozetka_ua");
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR - Finished");

  if (type === COUNT) {
    await Apify.pushData({ totalCount: await getOrIncStatsValue() });
  }
});
