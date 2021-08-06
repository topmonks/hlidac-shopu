const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const Apify = require("apify");
// const httpRequest = require("@apify/http-request");
const cheerio = require("cheerio");
const {
  handleDetail,
  handleStart,
  handleLeftMenu,
  handlePage,
  handleTrhak,
  handleTrhakDetail
} = require("./routes");
const getCountry = require("./countryProvider");
const UserAgentDb = require("./user-agent-db");

const {
  utils: { log, requestAsBrowser }
} = Apify;

let stats = {
  details: 0,
  duplicates: 0,
  pages: 0,
  target: 0,
  targetPages: 0,
  denied: 0,
  captchas: 0,
  ok: 0,
  zeroItems: 0
};

/*
async function getXmlLinks(
  domain,
  requestQueue,
  proxyConfiguration,
  userAgentDb
) {
  const url = `${domain.baseUrl}/_sitemap-categories.xml`;
  log.info(url);
  const { body } = await httpRequest({
    url,
    proxyUrl: await proxyConfiguration.newUrl(),
    http2: true,
    headers: {
      "User-Agent": userAgentDb.getRandom(),
      "Accept-Language": "cs,sk;q=0.8,en-US;q=0.5,en;q=0.3",
      "Upgrade-Insecure-Requests": 1,
      Referer: "https://www.google.com/"
    }
  });
  const categoryUrls = body.match(domain.regex);
  const sources = [];
  if (categoryUrls !== null) {
    log.info(`Adding to the queue ${categoryUrls.length} from XML`);
    for (const url of categoryUrls) {
      sources.push({
        url,
        userData: {
          label: "PAGE",
          baseUrl: url
        }
      });
    }
  }
  return sources;
}

 */

async function callKeboolaUpload(country, type) {
  const countryLower = country.toLowerCase();

  // resolve graphName for statistic dashboard
  let graphName;
  let tableName;
  if (countryLower !== "cz") {
    graphName = `alza_${countryLower}`;
    tableName = `alza_${countryLower}`;
  } else if (type === "FULL") {
    graphName = "alza";
    tableName = "alza";
  } else if (type === "BF") {
    graphName = "alza_cz_blackFriday";
    tableName = "alza_bf";
  } else if (type === "TRHAK") {
    graphName = "alza_cz_trhak";
    tableName = "alza";
  }
  const env = await Apify.getEnv();
  try {
    await uploadToKeboola(tableName);

    /*
    const run = await Apify.call(
      "blackfriday/uploader",
      {
        datasetId: env.defaultDatasetId,
        upload: true,
        actRunId: env.actorRunId,
        blackFriday: type !== "FULL",
        tableName
      },
      {
        waitSecs: 25
      }
    );
    log.info(`Keboola upload called: ${run.id}`);
    */
  } catch (e) {
    log.error(e);
  }

  // stats page
  try {
    const run = await Apify.callTask(
      "blackfriday/status-page-store",
      {
        datasetId: env.defaultDatasetId,
        name: graphName
      },
      {
        waitSecs: 25
      }
    );
    log.info(`Keboola upload called: ${run.id}`);
  } catch (e) {
    log.error(e);
  }
}

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const { country, type, test = false } = await Apify.getInput();

  if (!country) {
    throw new Error(
      "You need to specify the country on the input. Expecting DE/HU/AT/UK/CZ/SK"
    );
  }

  Apify.events.on("migrating", () => {
    // eslint-disable-next-line promise/catch-or-return
    Apify.setValue("STATS", stats).then(log.info("STATS saved!"));
  });
  const userAgentDb = new UserAgentDb();

  const domain = getCountry(country);
  const apifyProxyGroups = domain.proxies;
  const currency = domain.currency;

  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: apifyProxyGroups
  });

  const loadedStats = await Apify.getValue("STATS");

  if (loadedStats) {
    stats = loadedStats;
  } else if (type === "FULL") {
    await requestQueue.addRequest({
      url: domain.baseUrl,
      userData: {
        label: "START"
      }
    });
  } else if (type === "TRHAK") {
    const urlsList = [
      `${domain.baseUrl}/trhakdne`,
      `${domain.baseUrl}/pet/trhakdne`,
      `${domain.baseUrl}/hobby/trhakdne`,
      `${domain.baseUrl}/sport/trhakdne`,
      `${domain.baseUrl}/hracky/trhakdne`,
      `${domain.baseUrl}/media/trhakdne`,
      `${domain.baseUrl}/beauty/trhakdne`,
      `${domain.baseUrl}/maxi/trhakdne`,
      `${domain.baseUrl}/auto/trhakdne`
    ];
    for (let i = 0; i < urlsList.length; i++) {
      await requestQueue.addRequest({
        url: urlsList[i],
        userData: {
          label: "TRHAK"
        }
      });
    }
  }

  function isMalformedUrl(url, countryCode) {
    //TODO temporary fix
    if (countryCode === "cz" && !url.includes("alza.cz/")) {
      return true;
    }
    if (countryCode === "sk" && !url.includes("alza.sk/")) {
      return true;
    }
    if (countryCode === "de" && !url.includes("alza.de/")) {
      return true;
    }
    if (countryCode === "uk" && !url.includes("alza.uk/")) {
      return true;
    }
    if (countryCode === "hu" && !url.includes("alza.hu/")) {
      return true;
    }
    if (countryCode === "at" && !url.includes("alza.at/")) {
      return true;
    }
    return false;
  }

  const persistState = async () => {
    log.info(stats);
    log.info(`Denied ratio: ${(stats.denied / stats.ok) * 100}`);
    await Apify.setValue("STATS", stats);
  };
  Apify.events.on("persistState", persistState);
  // log more often
  setInterval(() => {
    log.info(stats);
  }, 20 * 1000);

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    // proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      persistStateKeyValueStoreId: "alza-sessions"
    },
    // persistCookiesPerSession: true,
    maxConcurrency: 30,
    maxRequestRetries: 5,
    handleRequestFunction: async context => {
      const { request, session } = context;
      const { label } = request.userData;

      log.info(`Visiting: ${request.url}, ${label}`);
      if (
        label !== "START" &&
        isMalformedUrl(request.url, country.toLowerCase())
      ) {
        log.info(`Malformed url ignored: ${request.url}`);
        return; // do not process malformed url eg https://www.alza.czvlacky/18857232.htm
      }
      let response;
      try {
        response = await requestAsBrowser({
          url: request.url,
          proxyUrl: await proxyConfiguration.newUrl(session.id),
          http2: true,
          headers: {
            "User-Agent": userAgentDb.getRandom(),
            "Accept-Language":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Upgrade-Insecure-Requests": 1,
            Referer: "https://www.google.com/"
          }
        });
      } catch (e) {
        await Apify.utils.sleep(5000);
        stats.denied++;
        request.retryCount--;
        session.isBlocked();
        throw new Error("Proxy blocked");
      }
      const { body } = response;

      // for this we don't need to parse the response in cheerio
      if (request.userData.label === "XML") {
        const categoryUrls = body.match(domain.regex);
        if (categoryUrls !== null) {
          log.info(`Adding to the queue ${categoryUrls.length} from XML`);
          for (const url of categoryUrls) {
            await requestQueue.addRequest({
              url,
              userData: {
                label: "PAGE",
                baseUrl: url
              }
            });
          }
        }
        return;
      }
      const $ = cheerio.load(body);
      context.$ = $;
      if ($(".captcha-mid").length !== 0) {
        stats.captchas++;
        request.retryCount--;
        session.retire();
        throw new Error("Captcha Encountered");
      }

      if ($("h1").eq(0).text() === "403 Forbidden") {
        await Apify.utils.sleep(5000);
        stats.denied++;
        request.retryCount--;
        session.retire();
        throw new Error("Access Denied");
      }

      stats.ok++;
      session.setCookiesFromResponse(response);

      switch (label) {
        case "LEFTMENU":
          return handleLeftMenu(context, domain, requestQueue);
        case "PAGE":
          return handlePage(
            context,
            country,
            type,
            domain,
            requestQueue,
            stats,
            currency
          );
        case "DETAIL":
          return handleDetail(context, country, currency);
        case "TRHAK":
          return handleTrhak(context, domain, requestQueue);
        case "TRHAK_DETAIL":
          return handleTrhakDetail(context, domain, country, currency);
        default:
          return handleStart(context, domain, requestQueue, stats);
      }
    },
    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request, error }) => {
      log.error(`Request ${request.url} ${error.message} failed 4 times`);
    }
  });

  // Run crawler.
  await crawler.run();

  log.info("Crawler finished, calling upload.");

  await invalidateCDN(
    cloudfront,
    "EQYSHWUECAQC9",
    `alza.${country.toLowerCase()}`
  );
  log.info("invalidated Data CDN");

  if (!test) {
    // calling the keboola upload
    await callKeboolaUpload(country, type);
  }

  log.info("Finished.");
});
