import Apify from "apify";
import {
  handleAPIStart,
  handleAPIList,
  handleAPIDetail,
  handleFrontStart,
  handleFrontList,
  handleFrontDetail,
  handleSitemapStart,
  handleSitemapList
} from "./src/routes.js";
import { URL_API_START, URL_SITEMAP, URL_FRONT, LABELS } from "./src/const.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";

let stats = {};
const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    requests: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const input = await Apify.getInput();
  const {
    development = true,
    type = LABELS.API_START, // [LABELS.API_START, LABELS.SITEMAP_START]
    maxConcurrency = 100,
    maxRequestRetries = 4,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  log.info("DEVELOMENT: " + development);

  let sources = [];

  log.info("type: " + type);

  switch (type) {
    // Scraping via API
    case LABELS.API_START:
      sources.push({
        url: URL_API_START,
        userData: {
          label: LABELS.API_START
        }
      });
      break;

    // Unfinished frontend scraping
    case LABELS.FRONT_START:
      sources.push({
        url: URL_FRONT,
        userData: {
          label: LABELS.FRONT_START
        }
      });
      break;

    // Product counter
    case LABELS.SITEMAP_START:
      sources.push({
        url: URL_SITEMAP,
        userData: {
          label: LABELS.SITEMAP_START
        }
      });
      break;
  }

  if (development) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-url", sources);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawlContext = {
    requestQueue,
    development,
    stats,
    proxyConfiguration
  };

  //const crawler = new Apify.CheerioCrawler({
  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    maxRequestRetries,
    maxConcurrency,
    handleRequestFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case LABELS.API_START:
          return handleAPIStart(context, crawlContext);
        case LABELS.API_LIST:
          return handleAPIList(context, crawlContext);
        case LABELS.API_DETAIL:
          return handleAPIDetail(context, crawlContext);

        case LABELS.FRONT_START:
          return handleFrontStart(context, crawlContext);
        case LABELS.FRONT_LIST:
          return handleFrontList(context, crawlContext);
        case LABELS.FRONT_DETAIL:
          return handleFrontDetail(context, crawlContext);

        case LABELS.SITEMAP_START:
          return handleSitemapStart(context, crawlContext);
        case LABELS.SITEMAP_LIST:
          return handleSitemapList(context, crawlContext);

        default:
          console.error("Unknown label " + label);
      }
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed ${maxRequestRetries} times`);
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();

  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats, null, 2));

  /*
  if (!development) {
    try {
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "conrad.cz");
      log.info("invalidated Data CDN");
      await uploadToKeboola("conrad_cz");
      log.info("upload to Keboola finished");
    } catch (e) {
      console.log(e);
    }
  }
  */
});
