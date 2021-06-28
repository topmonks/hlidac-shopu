const Apify = require("apify");
const randomUA = require("modern-random-ua");
const tools = require("./src/tools");
const { load } = require("cheerio");
const { LABELS, COUNTRY_TYPE, HEADER, BASE_URL } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

const ROOT_URL = "https://aaaauto.cz/ojete-vozy";
const ROOT_URL_SK = "https://www.aaaauto.sk/ojazdene-vozidla/";

Apify.main(async () => {
  log.info("Starting AAAAuto prices scraper");

  const input = await Apify.getInput();
  const { country = COUNTRY_TYPE.CZ } = input;
  const rootUrl = country === COUNTRY_TYPE.CZ ? ROOT_URL : ROOT_URL_SK;
  const requestQueue = await Apify.openRequestQueue();
  const countryType =
    country === COUNTRY_TYPE.CZ ? COUNTRY_TYPE.CZ : COUNTRY_TYPE.SK;
  await requestQueue.addRequest({
    url: BASE_URL(countryType),
    headers: { ...HEADER, "User-Agent": randomUA.generate() },
    userData: {
      label: LABELS.START
    }
  });
  const proxyUrl = (await Apify.createProxyConfiguration({})).newUrl();

  // Create route
  const router = tools.createRouter({
    requestQueue,
    country,
    rootUrl
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 1,
    handleRequestTimeoutSecs: 300,
    handleRequestFunction: async ({ request }) => {
      log.info(`Scraping ${request.url}`);
      const { label } = request.userData;

      const response = await requestAsBrowser({
        url: request.url,
        proxyUrl,
        headers: request.headers,
        json: true
      });

      const $ = load(response.body.html);

      // Redirect to route
      await router(request.userData.label, { $, request });
      if (label === LABELS.START) {
      } else if (label === LABELS.PAGE) {
      }
    }
  });
  await crawler.run();

  log.info("Crawler finished.");
  const env = await Apify.getEnv();
  try {
    const run = await Apify.call(
      "blackfriday/uploader",
      {
        datasetId: env.defaultDatasetId,
        upload: true,
        actRunId: env.actorRunId,
        blackFriday: false,
        tableName: country !== "CZ" ? "aaaauto_sk" : "aaaauto_cz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Keboola upload called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }

  // stats page
  try {
    const run = await Apify.callTask(
      "blackfriday/status-page-store",
      {
        datasetId: env.defaultDatasetId,
        name: "aaaauto_cz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Status page called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }
});
