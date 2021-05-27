const Apify = require("apify");
const cheerio = require("cheerio");
const zlib = require("zlib");

const { log, requestAsBrowser } = Apify.utils;
const BF = "BF";
let stats = {};
const processedIds = new Set();

/**
 * Gets attribute as text from a ElementHandle.
 * @param {ElementHandle} element - The element to get attribute from.
 * @param {string} attr - Name of the attribute to get.
 */
const WEB = "https://www.mironet.cz";
const SITEMAP_URL = "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz";

async function enqueueRequests(requestQueue, items) {
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function enqueueAllCategories(requestQueue) {
  const stream = await requestAsBrowser({ url: SITEMAP_URL, stream: true });
  const buffer = await streamToBuffer(stream);
  const xmlString = zlib.unzipSync(buffer).toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const categoryUrls = [];

  // Pick all urls from sitemap
  $("url").each(function () {
    const url = $(this).find("loc").text().trim();

    categoryUrls.push({
      url,
      userData: {
        label: "page",
        baseUrl: url
      }
    });
  });

  await enqueueRequests(requestQueue, categoryUrls);
  log.info(`Enqueued ${categoryUrls.length} categories`);
}

/** Main function */
Apify.main(async () => {
  const input = await Apify.getInput();
  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  };
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};
  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  // Open request queue and add statrUrl
  const requestQueue = await Apify.openRequestQueue();
  if (type === BF) {
    await requestQueue.addRequest({
      url: "https://www.mironet.cz/vyprodej/?v=black-friday",
      userData: {
        label: "category_vyprodej"
      }
    });
  } else {
    await enqueueAllCategories(requestQueue);

    // for testing of single page
    /* await requestQueue.addRequest({
            url: 'https://www.mironet.cz/pameti-ram/do-pocitace-dimm/ddr4/16-gb+c32624/',
            userData: {
                label: 'page',
                baseUrl: 'https://www.mironet.cz/pameti-ram/do-pocitace-dimm/ddr4/16-gb+c32624/',
            },
        }); */
  }

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  // Create crawler
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    // Activates the Session pool.
    useSessionPool: true,
    // Overrides default Session pool configuration.
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    // Handle page context
    handlePageFunction: async ({ $, request, session, response }) => {
      if (response.statusCode !== 200 && response.statusCode !== 404) {
        log.info(`${request.url} -> Bad response code: ${response.statusCode}`);
        session.retire();
      }

      if (request.userData.label === "category_vyprodej") {
        const categories = [];
        let onclickUrl;
        $(".vyprodej_category_head").each(function () {
          const moreBox = $(this).find(".bpMoreBox");
          if (moreBox.length !== 0) {
            moreBox.find("a").each(function () {
              categories.push({
                url: `${WEB}${$(this).attr("href")}`,
                userData: {
                  label: "category"
                }
              });
            });
          } else {
            const onClick = $(this).attr("onclick");
            onclickUrl = onClick
              .replace("location.href=", "")
              .replace(/'/g, "");
          }
        });
        if (categories.length !== 0) {
          await enqueueRequests(requestQueue, categories);
        } else if (onclickUrl) {
          await requestQueue.addRequest({
            url: `${WEB}${onclickUrl}`,
            userData: {
              label: "category"
            }
          });
        }
      } else if (request.userData.label === "category") {
        const pages = [];
        const browseSubCategories = $("div#BrowseSubCategories > a");
        if (browseSubCategories.length > 0) {
          browseSubCategories.each(function () {
            pages.push({
              url: `${WEB}${$(this).attr("href")}`,
              userData: {
                label: "page",
                baseUrl: `${WEB}${$(this).attr("href")}`
              }
            });
          });
          stats.urls += pages.length;
          log.info(`Found ${pages.length} valid urls by ${request.url}`);
          await enqueueRequests(requestQueue, pages, false);
        } else {
          log.info(`Enqueue ${request.url} as a page`);
          await requestQueue.addRequest(
            new Apify.Request({
              url: request.url,
              userData: {
                label: "page",
                baseUrl: `${WEB}${$(this).attr("href")}`
              }
            })
          );
        }
      }
      // This is the category page
      else if (
        request.userData.label === "page" ||
        request.userData.label === "pages"
      ) {
        try {
          if (request.userData.label === "page") {
            let pageNum = 0;
            $("a.PageNew").each(function () {
              pageNum =
                pageNum < parseInt($(this).text().trim())
                  ? parseInt($(this).text().trim())
                  : pageNum;
              // pageItems.push(`${request.userData.baseUrl}${$(this).attr('href')}`);
            });
            if (pageNum > 0) {
              stats.pages += pageNum;
              log.info(`Found ${pageNum} pages on ${request.url}`);
              const { baseUrl } = request.userData;
              const url = baseUrl.includes("?")
                ? `${baseUrl}&PgID=`
                : `${baseUrl}?PgID=`;
              for (let i = 2; i <= pageNum; i++) {
                await requestQueue.addRequest(
                  new Apify.Request({
                    userData: {
                      label: "pages",
                      baseUrl: request.userData.baseUrl
                    },
                    url: `${url}${i}`
                  })
                );
              }
            }
          }
          const breadCrumbs = [];
          $("div#displaypath > a.CatParent").each(function () {
            breadCrumbs.push($(this).text().trim());
          });
          // Iterate all products and extract data
          const results = [];
          $(".item_b").each(function () {
            const toNumber = p =>
              parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);

            const idElem = $(this).find(".item_kod");
            const linkElem = $(this).find(".nazev a");
            const priceElem = $(this).find(".item_cena");
            const imgElem = $(this).find(".item_obr img");
            const oPriceElem = $(this).find(".item_s_cena span");
            const img =
              imgElem.length !== 0 ? `https:${imgElem.attr("src")}` : null;
            const link = linkElem.length !== 0 ? linkElem.attr("href") : null;
            const id =
              idElem.length !== 0
                ? idElem.text().trim().replace("Kód: ", "")
                : null;
            const name = linkElem.length !== 0 ? linkElem.text().trim() : null;
            const price =
              priceElem.length !== 0 ? priceElem.text().trim() : false;
            const dataItem = {
              img,
              itemId: id,
              itemUrl: `${WEB}${link}`,
              itemName: name,
              discounted: !!oPriceElem,
              currentPrice: price ? toNumber(price) : null,
              breadCrumbs
            };
            if (oPriceElem.length !== 0) {
              const oPrice = oPriceElem.text().trim();
              dataItem.originalPrice = toNumber(oPrice);
            }
            // Save data to dataset
            if (!processedIds.has(dataItem.itemId)) {
              processedIds.add(dataItem.itemId);
              results.push(dataItem);
            } else {
              stats.itemsDuplicity++;
            }
          });
          stats.items += results.length;
          log.info(
            `Found ${results.length}  items, storing them. ${request.url}`
          );
          await Apify.pushData(results);
        } catch (e) {
          stats.failed++;
          log.error(e);
          console.log(`Failed extraction of items. ${request.url}`);
          console.error(e);
        }
      }
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 4 times`);
    }
  });

  // Run crawler
  await crawler.run();

  // calling the keboola upload
  if (!development) {
    try {
      const env = await Apify.getEnv();
      const run = await Apify.call(
        "blackfriday/uploader",
        {
          datasetId: env.defaultDatasetId,
          upload: true,
          actRunId: env.actorRunId,
          blackFriday: type !== "FULL",
          tableName: type !== "FULL" ? "mironet_bf" : "mironet"
        },
        {
          waitSecs: 25
        }
      );
      log.info(`Keboola upload called: ${run.id}`);
    } catch (e) {
      log.error(e);
    }
    // stats page
    try {
      const env = await Apify.getEnv();
      const run = await Apify.callTask(
        "blackfriday/status-page-store",
        {
          datasetId: env.defaultDatasetId,
          name: type !== "FULL" ? "mironet-black-friday" : "mironet-scraper"
        },
        {
          waitSecs: 25
        }
      );
      log.info(`Status page called: ${run.id}`);
    } catch (e) {
      log.error(e);
    }
  }

  log.info("Finished.");
});
