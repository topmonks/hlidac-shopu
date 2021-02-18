const Apify = require("apify");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

const HOST = "https://www.tetadrogerie.cz";

const makeListingUrl = (baseUrl, currentPage = 1, pageSize = 100) =>
  `${HOST}${baseUrl}?${new URLSearchParams({
    stranka: currentPage,
    pocet: pageSize
  })}`;

function* traverseCategories($, $menu) {
  for (const selector of [
    "ul.j-cat-3>li>a",
    "ul.j-cat-2>li>a",
    "ul.j-shop-categories-menu>li>a"
  ]) {
    for (const category of $menu.find(selector).toArray()) {
      yield $(category).attr("href");
    }
  }
}

function* paginateResults(count) {
  const length = Math.ceil(count / 100);
  for (let i = 1; i <= length; i++) {
    yield i;
  }
}

function parseItems($) {
  const category = $(".sx-breadcrumbs.sx-breadcrumbs-middle a")
    .get()
    .map(x => $(x).text())
    .join(" > ")
    .replace("Úvod > Eshop > ", "");
  return $(".j-products .j-item")
    .get()
    .map(el => {
      const $el = $(el);
      const actionPrice = $el.find(".sx-item-price-action");
      const initialPrice = $el.find(".sx-item-price-initial");
      const itemUrl = HOST + $el.find(".sx-item-title").attr("href");
      const currentPrice =
        parseInt((actionPrice.length ? actionPrice : initialPrice).text(), 10) /
        100;
      const originalPrice =
        parseInt((actionPrice.length ? initialPrice : $("<div/>")).text(), 10) /
        100;
      return {
        itemId: $el.find(".j-product").data("skuid"),
        itemName: $el.find(".sx-item-title").text(),
        img: $el.find("img").attr("src"),
        itemUrl,
        currentPrice,
        originalPrice: isNaN(originalPrice) ? null : originalPrice,
        category
      };
    });
}

/**
 * Creates Page Function for scraping
 * @param {RequestQueue} requestQueue
 * @returns {CheerioHandlePage}
 */
function pageFunction(requestQueue) {
  const processedIds = new Set();

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handler(context) {
    const { $, body, contentType, request, response } = context;
    const { step, category, currentPage } = request.userData;
    const text = body.toString(contentType.encoding);
    if (response.statusCode !== 200) {
      log.info(text);
    }

    const itemsCount = parseInt(
      $(".j-product-count-main").text().match(/(\d+)/)[1],
      10
    );

    if (step === "START") {
      log.info("Pagination info", { allItemsCount: itemsCount });
      for (const category of traverseCategories($, $(".j-eshop-menu"))) {
        await requestQueue.addRequest({
          url: makeListingUrl(category),
          userData: {
            category,
            currentPage: 1
          }
        });
      }
    } else {
      log.info("Pagination info", { category, itemsCount, currentPage });
      if (currentPage === 1 && itemsCount > 100) {
        // push pages of sub categories to the front of the queue
        // so they are processed before higher categories
        for (const page of paginateResults(itemsCount)) {
          await requestQueue.addRequest(
            {
              url: makeListingUrl(category, page),
              userData: {
                category,
                currentPage: page
              }
            },
            { forefront: true }
          );
        }
      }
      // we don't need to block pushes, we will await them all at the end
      const requests = [];
      // push only unique items
      const unprocessedProducts = parseItems($).filter(
        x => !processedIds.has(x.itemId)
      );
      requests.push(Apify.pushData(unprocessedProducts));

      // mark newly proceeded product IDs
      for (const id of unprocessedProducts.map(x => x.itemId)) {
        processedIds.add(id);
      }

      // await all requests, so we don't end before they end
      await Promise.all(requests);
    }
  }

  return handler;
}

async function uploadToKeboola(tableName) {
  try {
    /** @type {ApifyEnv} */
    const env = await Apify.getEnv();
    /** @type {ActorRun} */
    const run = await Apify.call(
      "blackfriday/uploader",
      {
        datasetId: env.defaultDatasetId,
        upload: true,
        actRunId: env.actorRunId,
        tableName
      },
      {
        waitSecs: 25
      }
    );
    log.info(`Keboola upload called: ${run.id}`);
  } catch (err) {
    log.error(err);
  }
}

Apify.main(async () => {
  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({
    url: makeListingUrl("/eshop", 1, 20),
    userData: {
      step: "START"
    }
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 10,
    handlePageFunction: pageFunction(requestQueue),

    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await uploadToKeboola("teta_cz");
  log.info("Finished.");
});
