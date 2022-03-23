import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import cheerio from "cheerio";
import { URL, URLSearchParams } from "url";

/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;
let stats = {};
const processedIds = new Set();

const HOST = "https://www.tetadrogerie.cz";

const makeListingBfUrl = function (baseUrl, currentPage = 1, pageSize = 60) {
  const url = new URL(baseUrl);
  let params = new URLSearchParams(url.search);
  //Add/Update parameters.
  params.set("stranka", currentPage);
  params.set("pocet", pageSize);
  // change the search property of the main url
  url.search = params.toString();
  return url.toString();
};

const makeListingUrl = (baseUrl, currentPage = 1, pageSize = 60) =>
  new URL(
    `${baseUrl}?${new URLSearchParams({
      stranka: currentPage,
      pocet: pageSize,
      razeni: "price"
    })}`,
    HOST
  ).href;

const categoryLinkSelectors = [
  "ul.j-cat-3>li>a",
  "ul.j-cat-2>li>a",
  "ul.j-shop-categories-menu>li>a"
];

function* traverseCategories($, $menu) {
  for (const selector of categoryLinkSelectors) {
    for (const category of $menu.find(selector).toArray()) {
      yield $(category).attr("href");
    }
  }
}

function* paginateResults(count) {
  const length = Math.ceil(count / 60);
  for (let i = 1; i <= length; i++) {
    yield i;
  }
}

function parseItem($, category) {
  return el => {
    const $el = $(el);
    const actionPrice = parseFloat(
      $el.find(".sx-item-price-action").text().replace(/\s+/g, "")
    );
    const initialPrice = parseFloat(
      $el.find(".sx-item-price-initial").first().text().replace(/\s+/g, "")
    );
    const originalPrice = actionPrice ? initialPrice / 100 : null;
    const currentPrice = actionPrice ? actionPrice / 100 : initialPrice / 100;
    const itemUrl = new URL($el.find(".sx-item-title").attr("href"), HOST).href;
    return {
      itemId: $el.find(".j-product").data("skuid"),
      itemName: $el.find(".sx-item-title").text(),
      img: $el.find("img").attr("src"),
      itemUrl,
      currentPrice,
      originalPrice: originalPrice > currentPrice ? originalPrice : null,
      discounted: originalPrice > currentPrice,
      inStock: true,
      category
    };
  };
}

function parseItems($) {
  let category = $(".CMSBreadCrumbsLink")
    .get()
    .map(x => $(x).text());
  const currentCategory = $(".CMSBreadCrumbsCurrentItem")
    .get()
    .map(x => $(x).text());
  category.push(currentCategory);
  return $(".j-products .j-item")
    .get()
    .map(parseItem($, category.join(" > ")));
}

/**
 * Creates Page Function for scraping
 * @param {RequestQueue} requestQueue
 * @param {S3Client} s3
 * @returns {CheerioHandlePage}
 */
async function pageFunction(requestQueue, s3) {
  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handler(context) {
    const { request, response, page } = context;
    const { step, category, currentPage } = request.userData;
    await page.waitForSelector(".sx-item-price-group");
    const text = await page.content();
    const $ = cheerio.load(text);
    if (response.status() !== 200) {
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
        stats.categories++;
      }
    } else if (step === "BF") {
      log.info("Pagination info", { itemsCount, currentPage });
      if (!currentPage) {
        // push pages of sub categories to the front of the queue
        // so they are processed before higher categories
        const paginateResultsData = paginateResults(itemsCount);
        let lastPage = 1;
        //Because shop dont use offsets, last page include all items from previous pages. Dont need scrap them, skip to last.
        for (const page of paginateResultsData) {
          lastPage = page;
        }
        if (lastPage !== 1) {
          log.info(
            "Add last pagination to queue: " +
              makeListingBfUrl(request.url, lastPage)
          );
          await requestQueue.addRequest({
            url: makeListingBfUrl(request.url, lastPage),
            userData: {
              currentPage: page,
              category: "BF"
            }
          });
        }
      }
    } else {
      log.info("Pagination info", { category, itemsCount, currentPage });
      if (currentPage === 1 && itemsCount > 60 && category !== "BF") {
        // push pages of sub categories to the front of the queue
        // so they are processed before higher categories
        const paginateResultsData = paginateResults(itemsCount);
        let lastPage = 1;
        //Because shop dont use offsets, last page include all items from previous pages. Dont need scrap them, skip to last.
        for (const page of paginateResultsData) {
          lastPage = page;
        }
        if (lastPage !== 1) {
          log.info(
            "Add last pagination to queue: " +
              makeListingUrl(category, lastPage)
          );
          await requestQueue.addRequest(
            {
              url: makeListingUrl(category, lastPage),
              userData: {
                category,
                currentPage: lastPage
              }
            },
            { forefront: true }
          );
        }
      }
      // we don't need to block pushes, we will await them all at the end
      const requests = [];
      // push only unique items
      const parsedItems = parseItems($);
      stats.totalItems += parsedItems.length;
      const unprocessedProducts = parsedItems.filter(
        x => !processedIds.has(x.itemId)
      );
      const duplicityItemsCount =
        parsedItems.length - unprocessedProducts.length;
      if (duplicityItemsCount > 0) {
        log.info(
          `Found ${duplicityItemsCount}x duplicity items, ${request.url}`
        );
      }
      stats.itemsDuplicity += duplicityItemsCount;

      for (const detail of unprocessedProducts) {
        requests.push(
          Apify.pushData(detail),
          uploadToS3v2(s3, detail, { priceCurrency: "CZK" })
        );

        // remember processed product IDs
        processedIds.add(detail.itemId);
      }
      stats.items += unprocessedProducts.length;
      log.info(
        `Found ${unprocessedProducts.length}x unique items, ${request.url}`
      );
      // await all requests, so we don't end before they end
      await Promise.allSettled(requests);
    }
  }

  return handler;
}

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    test = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    type = ActorType.FULL,
    bfUrl = "https://www.tetadrogerie.cz/eshop/produkty?offerID=ESH210007"
  } = input ?? {};

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0,
    failed: 0
  };

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  if (development && test) {
    await requestQueue.addRequest({
      url: "https://www.tetadrogerie.cz/eshop/produkty/uklid/myti-nadobi/doplnky-do-mycky?pocet=40&razeni=price"
    });
  } else if (type === ActorType.BF) {
    await requestQueue.addRequest({
      url: `${bfUrl}&pocet=60&razeni=price`,
      userData: {
        step: "BF"
      }
    });
  } else {
    await requestQueue.addRequest({
      url: makeListingUrl("/eshop", 1, 20),
      userData: {
        step: "START"
      }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false
  });

  const crawler = new Apify.PlaywrightCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    navigationTimeoutSecs: 120,
    launchContext: {
      useChrome: true,
      launchOptions: {
        headless: true
      }
    },
    handlePageFunction: await pageFunction(requestQueue, s3),

    handleFailedRequestFunction: async ({ request }) => {
      stats.failed++;
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Apify.setValue("STATS", stats);
  log.info(JSON.stringify(stats));

  if (!development) {
    let tableName = "teta_cz";
    if (type === ActorType.BF) {
      tableName = `${tableName}_bf`;
    }
    await Promise.allSettled([
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", "tetadrogerie.cz"),
      uploadToKeboola(tableName)
    ]);
    log.info("invalidated Data CDN");
  }
  log.info("Finished.");
});
