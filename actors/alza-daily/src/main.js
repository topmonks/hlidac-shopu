const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const Apify = require("apify");
const { gotScraping } = require("got-scraping");
const httpRequest = require("@apify/http-request");
const cheerio = require("cheerio");
const {
  handleDetail,
  handleStart,
  handleLeftMenu,
  handlePage,
  handleBF,
  handleTrhak,
  handleTrhakDetail
} = require("./routes");
const getCountry = require("./countryProvider");
const UserAgentDb = require("./user-agent-db");

const {
  utils: { log, requestAsBrowser }
} = Apify;

let stats = {
  categories: 0,
  details: 0,
  duplicates: 0,
  pages: 0,
  items: 0,
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
  let tableName = "alza";
  if (type === "FULL" && countryLower !== "cz") {
    tableName = `${tableName}_${countryLower}`;
  } else if (type === "BF") {
    tableName = `${tableName}_${countryLower}_bf`;
  }
  try {
    await uploadToKeboola(tableName);
  } catch (e) {
    log.error(e);
  }
}

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    country = "CZ",
    type = "FULL",
    maxConcurrency = 30,
    maxRequestRetries = 5
  } = input ?? {};

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
      url: `${domain.baseUrl}/`,
      userData: {
        label: "LEFTMENU"
      },
      uniqueKey: Math.random().toString()
    });
    await requestQueue.addRequest({
      url: `${domain.baseUrl}/_sitemap-categories.xml`,
      userData: {
        label: "XML"
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
  } else if (type === "BF") {
    await requestQueue.addRequest({
      url: `https://www.alza.${country.toLowerCase()}/black-friday`,
      userData: {
        label: "BF"
      }
    });
  } else if (type === "TEST") {
    const testUrl = "https://www.alza.cz/kuchynske-roboty/18850372.htm";
    await requestQueue.addRequest({
      url: testUrl,
      userData: {
        label: "PAGE",
        baseUrl: testUrl
      }
    });
  }

  function isMalformedUrl(url, countryCode) {
    //TODO temporary fix
    if (!url.includes(`alza.${countryCode}/`)) {
      return true;
    }
    return false;
    /*
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
    */
  }

  const persistState = async () => {
    log.info(`stats: ${JSON.stringify(stats)}`);
    log.info(`Denied ratio: ${(stats.denied / stats.ok) * 100}`);
    await Apify.setValue("STATS", stats);
  };
  Apify.events.on("persistState", persistState);
  // log more often
  setInterval(() => {
    log.info(`stats: ${JSON.stringify(stats)}`);
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
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    handleRequestFunction: async context => {
      const { request, session } = context;
      const { label, payload } = request.userData;

      log.info(`Visiting: ${request.url}, ${label}`);
      if (
        (label !== "START" || label !== "BF") &&
        isMalformedUrl(request.url, country.toLowerCase())
      ) {
        log.info(`Malformed url ignored: ${request.url}`);
        return; // do not process malformed url eg https://www.alza.czvlacky/18857232.htm
      }

      let response, parsedResponse, cheerioContext;
      if (type === "BF" && label === "PAGE") {
        try {
          const data = JSON.stringify(payload);
          const response = await httpRequest({
            url: request.url,
            method: "POST",
            proxyUrl: await proxyConfiguration.newUrl(session.id),
            payload: data,
            headers: {
              "User-Agent": userAgentDb.getRandom(),
              accept: "application/json, text/javascript, */*; q=0.01",
              "Content-type": "application/json",
              Referer: `https://www.alza.${country.toLowerCase()}/black-friday`,
              origin: `https://www.alza.${country.toLowerCase()}`,
              "Content-Length": data.length,
              Host: `www.alza.${country.toLowerCase()}`
            }
          });

          // Status code check
          if (![200, 404].includes(response.statusCode)) {
            session.retire();
            await Apify.setValue(`big${request.userData.log}`, response.body);
            request.retryCount--;
            throw new Error(
              `We got blocked by target on ${request.url}, ${response.statusCode}`
            );
          }

          try {
            parsedResponse = JSON.parse(response.body);
          } catch (e) {
            log.error(
              `ERROR page:${request.userData.log}, ${response.statusCode}`
            );
            await Apify.setValue(`big${request.userData.log}`, response.body);
            throw new Error(e.message);
          }
          const $ = cheerio.load(parsedResponse.d.Boxes);
          context.$ = $;
          /*response = await gotScraping.post({
            headerGeneratorOptions: {
              browsers: [
                {
                  name: "chrome",
                  minVersion: 89
                }
              ],
              devices: ["desktop"],
              locales: ["cs-CZ"],
              operatingSystems: ["windows"]
            },
            url: request.url,
            proxyUrl: await proxyConfiguration.newUrl(session.id),
            body: data,
            headers: {
              "User-Agent": userAgentDb.getRandom(),
              Accept: "application/json, *!/!*",
              "Content-Type": "application/json",
              Referer: `https://www.alza.${country.toLowerCase()}/black-friday`,
              origin: `https://www.alza.${country.toLowerCase()}`,
              "Content-Length": data.length,
              Host: `www.alza.${country.toLowerCase()}`
            }
          });*/
        } catch (e) {
          log.error(e.message);
          log.error(
            `ERROR page:${request.userData.log}, ${response.statusCode}`
          );
          await Apify.setValue(`big${request.userData.log}`, response.body);
          throw new Error(e.message);
        }
      } else {
        try {
          response = await gotScraping.post({
            headerGeneratorOptions: {
              browsers: [
                {
                  name: "chrome",
                  minVersion: 89
                }
              ],
              devices: ["desktop"],
              locales: ["cs-CZ"],
              operatingSystems: ["windows"]
            },
            url: request.url,
            proxyUrl: await proxyConfiguration.newUrl(session.id),
            headers: {
              "User-Agent": userAgentDb.getRandom(),
              "Accept-Language":
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
              "Upgrade-Insecure-Requests": 1,
              Referer: "https://www.google.com/"
            }
          });
        } catch (e) {
          log.error(e);
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
            stats.categories += categoryUrls.length;
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
      }

      switch (label) {
        case "LEFTMENU":
          return handleLeftMenu(context, domain, requestQueue, stats);
        case "PAGE":
          return handlePage(
            context,
            country,
            type,
            domain,
            requestQueue,
            stats,
            currency,
            development
          );
        case "DETAIL":
          return handleDetail(context, country, currency, stats, development);
        case "BF":
          return handleBF(context, domain, requestQueue, country, session);
        case "TRHAK":
          return handleTrhak(context, domain, requestQueue);
        case "TRHAK_DETAIL":
          return handleTrhakDetail(
            context,
            domain,
            country,
            currency,
            development
          );
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

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `alza.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    // calling the keboola upload
    await callKeboolaUpload(country, type);
  }

  log.info("Finished.");
});
