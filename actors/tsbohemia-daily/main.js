const Apify = require("apify");
const { Session } = require("apify/build/session_pool/session")
const {
  PlaywrightPlugin,
  PuppeteerPlugin
} = require("browser-pool");
const FingerprintGenerator = require("fingerprint-generator");
const { FingerprintInjector } = require("fingerprint-injector");


const playwright = require("playwright");
const cheerio = require("cheerio");
const utils = require("./src/utils");
const { LABELS, BASE_URL } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

const SITEMAP_URL = "https://www.tsbohemia.cz/sitemap_index.xml";

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function enqueueAllCategories() {
  const stream = await requestAsBrowser({
    url: SITEMAP_URL,
    stream: true
  });
  const buffer = await streamToBuffer(stream);
  const xmlString = buffer.toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const categoryXmlUrls = [];

  // Pick all category xml urls from sitemap
  $("sitemap").each(function () {
    const url = $(this).find("loc").text().trim();
    categoryXmlUrls.push(url);
  });
  log.info(`Enqueued ${categoryXmlUrls.length} product xml urls`);
  let requestListSources = [];
  for await (const xmlUrl of categoryXmlUrls) {
    const stream = await requestAsBrowser({
      url: xmlUrl,
      stream: true
    });
    const buffer = await streamToBuffer(stream);
    const xmlString = buffer.toString();
    const sitemapUrls = utils.getSitemapUrls(xmlString);
    requestListSources = requestListSources.concat(
      sitemapUrls
        .filter(url => url.match(/_c\d+.html/))
        .map(url => {
          return {
            url,
            userData: {
              label: LABELS.PAGE
            }
          };
        })
    );
  }
  log.info(`Found ${requestListSources.length} categories from sitemap`);
  return requestListSources;
}

/**
 * Gets attribute as text from a ElementHandle.
 * @param {ElementHandle} element - The element to get attribute from.
 * @param {string} attr - Name of the attribute to get.
 */
/** Main function */
Apify.main(async () => {
  log.info("ACTOR - Start");
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 2,
    proxyGroups = ["RESIDENTIAL"],
    type = "FULL"
  } = input ?? {};
  log.info(`ACTOR - input: ${JSON.stringify(input)}`);
  log.info("ACTOR - SetUp crawler");
  const requestQueue = await Apify.openRequestQueue();

  let requestListSources = [];
  if (type === LABELS.BF) {
    await requestQueue.addRequest({
      userData: { label: LABELS.BF },
      url: "https://www.tsbohemia.cz/black-friday_c41438.html"
    });
  } else if (type === "test") {
    await requestQueue.addRequest({
      url: "https://www.tsbohemia.cz/acer_c75.html",
      userData: {
        label: LABELS.PAGE
      }
    });
  } else {
    requestListSources = await enqueueAllCategories();
  }
  const requestList = await Apify.openRequestList("LIST", requestListSources);
  // Handle page context
  const handlePageFunction = async ({ request }) => {
    log.info(
      `Handling page ${request.url} with label ${request.userData.label}`
    );
    // This is the start page
    if (request.userData.label === LABELS.START) {
      /*      const categoryIds = [];

            $("a[data-strid]").each(function () {
              categoryIds.push({
                id: $(this).attr("data-strid"),
                name: $(this).text()
              });
            });

            for (const category of categoryIds) {
              const response = await getResponse(
                `https://www.tsbohemia.cz/default_jx.asp?show=sptnavigator&strid=${category.id}`
              );
              const responseCheerio = cheerio.load(response, {
                decodeEntities: false
              });
              responseCheerio(".level6 > li > a").each(async function () {
                const subCatUrl = `${BASE_URL}${responseCheerio(this).attr("href")}`;
                await requestQueue.addRequest({
                  url:
                    subCatUrl.indexOf("https") === -1
                      ? `https://www.tsbohemia.cz/${subCatUrl}`
                      : subCatUrl,
                  userData: { label: LABELS.PAGE, categoryName: category.name }
                });
              });
            }*/
    } else if (request.userData.label === LABELS.BF) {
      log.info("START BLACK FRIDAY");
      /* const categories = [];
            const tcs = $("ul.level9 a");
            for (let i = 0; i < tcs.length; i++) {
              const link = tcs[i];
              categories.push($(link).attr("href"));
            }

            // Enqueue category links
            for (const cat of categories) {
              log.info(`Adding to the queue ${cat}`);
              await requestQueue.addRequest({
                url:
                  cat.indexOf("https") === -1
                    ? `https://www.tsbohemia.cz${cat}`
                    : cat,
                userData: {
                  label: LABELS.PAGE,
                  name: "BF"
                }
              });
            }*/
    }

    // This is the category page
    else if (request.userData.label === LABELS.PAGE) {
      /*      // Enqueue pagination pages
            if (request.url.indexOf("page=") === -1 && $("p.reccount").length !== 0) {
              try {
                const paginationCount = Math.ceil(
                  parseInt($("p.reccount").eq(0).text()) / 26
                );
                for (let i = 2; i <= paginationCount; i++) {
                  await requestQueue.addRequest({
                    url: `${request.url}?page=${i}`,
                    userData: {
                      label: LABELS.PAGE,
                      name: request.userData.name
                    }
                  });
                }
                log.info(
                  `Adding to the queue ${paginationCount} paginations for url ${request.url}`
                );
              } catch (e) {
                log.error(e.message);
              }
            }

            const items = [];
            const toNumber = p => p.replace(/\s/g, "").match(/\d+/)[0];
            const navbar = $(".navbar ul > li");
            const category = [];
            if (navbar.length !== 0) {
              navbar.each(function () {
                const bs = $(this);
                if (!bs.hasClass("hp")) {
                  category.push(bs.text().trim());
                }
              });
            }
            $(".prodbox").each(function () {
              try {
                const itemId = $(this).attr("data-stiid");
                const oPriceElem = $(this).find(".price .mc");
                const img = $(this).find(".img img").eq(0).attr("data-src");
                const link = `https://www.tsbohemia.cz/${$(this)
                  .find("h2 a")
                  .eq(0)
                  .attr("href")}`;
                const name = $(this).find("h2 a").eq(0).text().trim();
                const price = $(this).find(".price .wvat").eq(0).text().trim();
                const dataItem = {
                  img,
                  itemId,
                  itemUrl: link,
                  itemName: name,
                  discounted: false,
                  currentPrice: price ? parseFloat(toNumber(price)) : null,
                  category,
                  menuCat: request.userData.name
                };
                if (oPriceElem.length !== 0) {
                  const oPrice = oPriceElem.text().trim();
                  dataItem.originalPrice = parseFloat(toNumber(oPrice));
                  dataItem.discounted = true;
                }

                // Save data to dataset
                items.push(dataItem);
              } catch (e) {
                log.error(e);
              }
            });
            // Iterate all products and extract data
            log.info(`Storing ${items.length} for url ${request.url}`);
            await Apify.pushData(items);*/
    }
  };

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    countryCode: "CZ"
  });

  const fingerprintGenerator = new FingerprintGenerator({
    devices: ['desktop'],
    browsers: [{ name: 'firefox', minVersion: 88 }],
    operatingSystems: ['windows'],
  });

  const fingerprintInjector = new FingerprintInjector();
  // Create crawler
  const crawler = new Apify.PlaywrightCrawler({
    requestList,
    requestQueue,
    maxRequestRetries,
    proxyConfiguration,
    maxConcurrency,
    handleRequestTimeoutSecs: 360,
    launchContext: {
      launchOptions: {
        headless: true,
      },
      launcher: playwright.firefox,
    },
    sessionPoolOptions: {
      maxPoolSize: 50
    },
    preNavigationHooks: [
      async (context, gotoOptions) => {
        gotoOptions.waitUntil = "domcontentloaded";

        const { browserController, session, request, page } = context;
        const cookies = session.getPuppeteerCookies(request.url);
        const validCookies = cookies.filter(cookie => cookie.name);
        await browserController.setCookies(page, validCookies)

        await page.route("**/*", (route, request) => {
          const blockedResources = ["image", "media", "stylesheet", "font"]

          if (blockedResources.includes(request.resourceType())) {
            return route.abort().catch(() => { })
          }

          return route.continue().catch(() => { })
        })

      }
    ],
    postNavigationHooks: [
      async (crawlingContext) => {
        const { response, session } = crawlingContext;
        const isCaptcha = response.status() === 403
        if (!isCaptcha) {
          log.info("No captcha")
          session.setCookiesFromResponse(response)
          return
        } else {
          log.warning("Captcha found")
          // solve using captcha solver and save cookies after redirect ot ts bohemia product pages.
        }
      },
    ],
    sessionPoolOptions: {
      createSessionFunction: async (sessionPool) => {
        const session = new Session({ sessionPool });
        session.userData.fingerprint = fingerprintGenerator.getFingerprint().fingerprint;
        return session;
      }
    },
    // we need custom cookie persistance because of malformed cookie format.
    persistCookiesPerSession: false,
    browserPoolOptions: {
      preLaunchHooks: [(pageId, launchContext) => {
        const { useIncognitoPages, launchOptions, session } = launchContext;
        const { fingerprint } = session.userData;
        launchContext.useIncognitoPages = true;

        if (useIncognitoPages) {
          return;
        }

        launchContext.launchOptions = {
          ...launchOptions,
          userAgent: fingerprint.userAgent,
          viewport: {
            width: fingerprint.screen.width,
            height: fingerprint.screen.height,
          },

        };
      }],
      prePageCreateHooks: [
        (pageId, browserController, pageOptions) => {
          const { launchContext } = browserController;
          const { fingerprint } = launchContext.session.userData;

          if (launchContext.useIncognitoPages && pageOptions) {
            pageOptions.userAgent = fingerprint.userAgent;
            pageOptions.viewport = {
              width: fingerprint.screen.width,
              height: fingerprint.screen.height,
            };
          }
        },
      ],
      postPageCreateHooks: [
        async (page, browserController) => {
          const { browserPlugin, launchContext } = browserController;
          const { fingerprint } = launchContext.session.userData;

          if (browserPlugin instanceof PlaywrightPlugin) {
            const { useIncognitoPages, isFingerprintInjected } = launchContext;

            if (isFingerprintInjected) {
              // If not incognitoPages are used we would add the injection script over and over which could cause memory leaks.
              return;
            }
            const context = page.context();
            await fingerprintInjector.attachFingerprintToPlaywright(context, fingerprint);

            if (!useIncognitoPages) {
              // If not incognitoPages are used we would add the injection script over and over which could cause memory leaks.
              launchContext.extend({ isFingerprintInjected: true });
            }
          } else if (browserPlugin instanceof PuppeteerPlugin) {
            await fingerprintInjector.attachFingerprintToPuppeteer(page, fingerprint);
          }
        },
      ],
    },
    handlePageFunction,
    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed ${maxRequestRetries} times`);
    }
  });

  // Run crawler
  log.info("ACTOR - Run crawler");
  await crawler.run();
  log.info("ACTOR - End crawler");

  if (!development) {
    // calling the keboola upload
    try {
      const env = await Apify.getEnv();
      const run = await Apify.call(
        "blackfriday/uploader",
        {
          datasetId: env.defaultDatasetId,
          upload: true,
          actRunId: env.actorRunId,
          blackFriday: type !== "FULL",
          tableName: type !== "FULL" ? "tsbohemia_bf" : "tsbohemia"
        },
        {
          waitSecs: 25
        }
      );
      log.info(`Keboola upload called: ${run.id}`);
    } catch (e) {
      console.log(e);
    }

    // stats page
    try {
      const env = await Apify.getEnv();
      const run = await Apify.callTask(
        "blackfriday/status-page-store",
        {
          datasetId: env.defaultDatasetId,
          name: type !== "FULL" ? "tsbohemia-black-friday" : "tsbohemia-scraper"
        },
        {
          waitSecs: 25
        }
      );
      log.info(`Keboola upload called: ${run.id}`);
    } catch (e) {
      console.log(e);
    }
  }

  log.info("ACTOR - Finished");
});
