const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const Apify = require("apify");
const { handleStart, handleList, handleDetail } = require("./routes");

const {
  utils: { log }
} = Apify;

Apify.main(async () => {
  const input = await Apify.getInput();
  const { development } = input ?? {};
  const requestQueue = await Apify.openRequestQueue();

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"], // List of Apify Proxy groups
    useApifyProxy: !development,
    countryCode: "CZ"
  });

  await requestQueue.addRequest({ url: "https://www.iglobus.cz" });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: false,
    maxConcurrency: 50,

    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
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

  // stats page
  try {
    const env = await Apify.getEnv();
    const run = await Apify.callTask(
      "blackfriday/status-page-store",
      {
        datasetId: env.defaultDatasetId,
        name: "globus-cz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Keboola upload called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }
  if (!development) {
    await uploadToKeboola("globus_cz");
  }

  console.log("Finished.");
});
