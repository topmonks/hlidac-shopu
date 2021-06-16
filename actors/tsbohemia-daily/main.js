const Apify = require("apify");
const playwright = require("playwright");
const cheerio = require("cheerio");
const { getResponse } = require("./src/requestRetry");
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
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
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
  } else if (type === "playwright") {
    const browser = await playwright.chromium.launch({
      headless: false,
      proxy: {
        server: "http://proxy.apify.com:8000",
        username: "groups-CZECH_LUMINATI,country-CZ",
        password: "8Wqsv97L7NTcEpJaqn7Q5SEGu" + ""
      }
    });
    // Open a new page / tab in the browser.
    const page = await browser.newPage();
    // Tell the tab to navigate to the JavaScript topic page.
    await page.goto("https://www.tsbohemia.cz/acer_c75.html");
    // Pause for 10 seconds, to see what's going on.
    await page.waitForTimeout(360000);
    // Turn off the browser to clean up after ourselves.
    await browser.close();
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

  const handlePageFunction = async ({ page, request }) => {
    await page.waitForTimeout(180000);
    // This is the start page
    if (request.userData.label === LABELS.START) {
      const categoryIds = [];

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
      }
    } else if (request.userData.label === LABELS.BF) {
      log.info("START BLACK FRIDAY");
      const categories = [];
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
      }
    }

    // This is the category page
    else if (request.userData.label === LABELS.PAGE) {
      // Enqueue pagination pages
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
      await Apify.pushData(items);
    }
    await Apify.utils.sleep(5000);
  };

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: false
  });

  // Create crawler
  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    persistCookiesPerSession: true,
    handlePageFunction,

    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed ${maxRequestRetries} times`);
      const browser = await playwright.chromium.launch({
        headless: false
        /*,proxy: {
          server: "http://proxy.apify.com:8000",
          username: "groups-CZECH_LUMINATI,country-CZ",
          password: "8Wqsv97L7NTcEpJaqn7Q5SEGu" + ""
        }*/
      });
      // Open a new page / tab in the browser.
      const page = await browser.newPage();
      // Tell the tab to navigate to the JavaScript topic page.
      await page.goto(request.url);
      const element = await page.waitForSelector("div#bodyout", {
        state: "attached",
        timeout: 0
      });

      await requestQueue.addRequest({
        url: request.url,
        userData: {
          label: LABELS.PAGE
        }
      });

      // Turn off the browser to clean up after ourselves.
      await browser.close();
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
