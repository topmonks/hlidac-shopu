const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const axios = require("axios");
const ProxyAgent = require("proxy-agent");
const { load } = require("cheerio");
const { createRouter } = require("./routes");
const { LABELS, COUNTRY, BF } = require("./const");
const tools = require("./tools");
const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  global.userInput = await Apify.getInput();
  const { type, country = COUNTRY.CZ } = global.userInput;
  const requestQueue = await Apify.openRequestQueue();
  if (type === BF) {
    await requestQueue.addRequest({
      url: "https://www.mountfield.cz/black-friday",
      userData: {
        label: LABELS.MAIN_CATEGORY,
        mainCategory: "Black Friday"
      }
    });
  } else {
    await requestQueue.addRequest({
      url: tools.getRootUrl(),
      userData: {
        label: LABELS.START
      }
    });
  }

  global.s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  // Create route
  const router = createRouter();

  // Set up the crawler, passing a single options object as an argument.
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 20,
    useSessionPool: true,
    handleRequestFunction: async context => {
      const { request, session } = context;
      const {
        url,
        userData: { label }
      } = request;

      const r = await axios.get(url, {
        agent: new ProxyAgent(proxyConfiguration.newUrl(session.id))
      });

      context.$ = await load(r.data);

      await router(label, context);
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(
    cloudfront,
    "EQYSHWUECAQC9",
    `dm.${country.toLowerCase()}`
  );
  log.info("invalidated Data CDN");

  await uploadToKeboola(tools.getTableName());
  log.info("Finished.");
});
