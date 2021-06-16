const Apify = require("apify");

const { log } = Apify.utils;
const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};
const BF = "BF";
const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};
const BASE_URL = "https://www.datart.cz";
const BASE_URL_SK = "https://www.datart.sk";

/**
 *
 * @param {Cheerio} $
 * @param {String} rootUrl
 * @param {COUNTRY.CZ|COUNTRY.SK} country
 * @returns {Promise<[]>}
 */
async function extractItems($, rootUrl, country) {
  const itemsArray = [];
  // products
  if ($("div.category-page-item").length > 0) {
    const categoryArr = [];
    $("p#breadcrumbs > a").each(function () {
      categoryArr.push($(this).text().trim());
    });
    categoryArr.push($("p#breadcrumbs > span").text().trim());

    $("div.category-page-item").each(function () {
      const result = {};

      // data id of the item to not enqueue the items multiply
      if ($(this).attr("data-id").length > 0) {
        result.itemId = $(this).attr("data-id");
      }

      if ($(this).attr("data-name").length > 0) {
        result.itemName = $(this)
          .attr("data-name")
          .replace(/(\n|\r)/g, "");
      }

      if ($(this).find("h3 a").length > 0) {
        result.itemUrl = `${rootUrl}${$(this).find("h3 a").attr("href")}`;
      }
      if ($(this).find("a.item-thumbnail-link img").length !== 0) {
        result.img = $(this).find("a.item-thumbnail-link img").attr("src");
      }

      if ($(this).find(".price .tooltip").length > 0) {
        const priceStr = $(this).find(".price .tooltip").text();
        result.currentPrice = parseFloat(
          priceStr.replace(/[^\d,]+/g, "").replace(",", ".")
        );
      } else {
        result.currentPrice = "Price not defined.";
      }

      if ($(this).find(".price del").length > 0) {
        const origPriceStr = $(this).find(".price del").text();
        result.originalPrice = parseFloat(
          origPriceStr.replace(/[^\d,]+/g, "").replace(",", ".")
        );
      }

      result.currency = country === COUNTRY.CZ ? "CZK" : "€";
      result.category = categoryArr;
      result.discounted = false;
      itemsArray.push(result);
    });
  }
  return itemsArray;
}

async function enqueuRequests(requestQueu, items) {
  for (const item of items) {
    await requestQueu.addRequest(item);
  }
}

Apify.main(async () => {
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = COUNTRY.CZ,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};
  const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();
  if (type === BF) {
    await requestQueue.addRequest({
      url: `${rootUrl}/black_friday/index.html`,
      userData: {
        label: LABELS.BF
      }
    });
  } else if (type === "FULL") {
    await requestQueue.addRequest({
      url: `${rootUrl}/katalog/index.html`,
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === "test") {
    await requestQueue.addRequest({
      url: "https://www.datart.cz/kvadrokoptery-drony-a-rc-modely.html?startPos=16",
      userData: {
        label: "CATEGORY_NEXT"
      }
    });
  }

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

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
    handlePageFunction: async ({ request, $, session, response }) => {
      if (response.statusCode !== 200) {
        session.retire();
      }

      // Process START page
      if (request.userData.label === LABELS.START) {
        const items = [];
        $("div#content")
          .find("a.list")
          .each(function () {
            const link = $(this).attr("href");
            items.push({
              url: `${rootUrl}${link}`,
              userData: {
                label: LABELS.CATEGORY,
                uniqueKey: Math.random()
              }
            });
          });
        console.log(`${request.url} Found ${items.length} categories`);
        await enqueuRequests(requestQueue, items);
      }

      // Process CATEGORY page
      if (request.userData.label === LABELS.CATEGORY) {
        try {
          // Add subcategories if this category has no listings
          if ($("div.subcategory-tree-list").length > 0) {
            const items = [];
            $("div.subcategory-tree-list")
              .find("a")
              .each(function () {
                const link = $(this).attr("href");
                items.push({
                  url: `${rootUrl}${link}`,
                  userData: {
                    label: LABELS.CATEGORY,
                    uniqueKey: Math.random()
                  }
                });
              });
            console.log(`${request.url} Found ${items.length} subcategories`);
            await enqueuRequests(requestQueue, items);
            return; // Nothing more we can do for this page
          }
          // Add pages from pagination
          const itemsInCategory = parseInt(
            $("#total-products-category").text()
          );
          const items = [];
          for (let i = 16; i < itemsInCategory; i += 16) {
            items.push({
              url: `${request.url}?startPos=${i}`,
              userData: {
                label: LABELS.CATEGORY_NEXT,
                uniqueKey: Math.random()
              }
            });
          }
          console.log(`${request.url} Adding ${items.length} pagination pages`);
          await enqueuRequests(requestQueue, items);
        } catch (e) {
          console.log(`Error processing url ${request.url}`);
          console.error(e);
        }
      }

      // Extract products from category page
      if (
        request.userData.label === LABELS.CATEGORY ||
        request.userData.label === LABELS.CATEGORY_NEXT
      ) {
        try {
          const products = await extractItems($, rootUrl, country);
          console.log(`${request.url} Found ${products.length} products`);
          await Apify.pushData(products);
        } catch (e) {
          console.log(`Failed to get products from page ${request.url}`);
          await Apify.pushData({
            status: "Failed to get products",
            url: request.url
          });
        }
      }

      if (request.userData.label === LABELS.BF) {
        log.info(`START BF ${request.url}`);
        const categories = [];
        $(".category-box").each(function () {
          categories.push({
            url: `${rootUrl}${$(this).attr("href")}`,
            userData: {
              label: LABELS.CATEGORY
            }
          });
        });
        log.info(`Found ${categories.length} BF categories`);
        await enqueuRequests(requestQueue, categories);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed multiple times`);
    }
  });

  // Run crawler.
  await crawler.run();

  console.log("crawler finished");
  try {
    const env = await Apify.getEnv();

    let tableName = "";

    if (type === "FULL" && country === "CZ") {
      tableName = "datart";
    } else if (type === "FULL" && country === "SK") {
      tableName = "datart_sk";
    } else if (type !== "FULL" && country === "CZ") {
      tableName = "datart_bf";
    } else if (type !== "FULL" && country === "SK") {
      tableName = "datart_sk_bf";
    }

    if (!development) {
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
      console.log(`Keboola upload called: ${run.id}`);
    }
  } catch (e) {
    console.log(e);
  }

  console.log("Finished.");
});
