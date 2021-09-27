const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const {
  toProduct,
  s3FileName,
  uploadToS3,
  invalidateCDN
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const cheerio = require("cheerio");
const { URL, URLSearchParams } = require("url");

/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

const HOST = "https://www.tetadrogerie.cz";

const makeListingUrl = (baseUrl, currentPage = 1, pageSize = 100) =>
  new URL(
    `${baseUrl}?${new URLSearchParams({
      stranka: currentPage,
      pocet: pageSize
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
  const length = Math.ceil(count / 100);
  for (let i = 1; i <= length; i++) {
    yield i;
  }
}

function parseItem($, category) {
  return el => {
    const $el = $(el);
    const actionPrice = $el.find(".sx-item-price-action");
    const initialPrice = $el.find(".sx-item-price-initial");
    const itemUrl = new URL($el.find(".sx-item-title").attr("href"), HOST).href;
    const currentPrice =
      parseInt(
        (actionPrice.length ? actionPrice : initialPrice)
          .text()
          .replace(/\s+/g, ""),
        10
      ) / 100;
    const originalPrice =
      parseInt(
        (actionPrice.length ? initialPrice : $("<div/>"))
          .text()
          .replace(/\s+/g, ""),
        10
      ) / 100;
    return {
      itemId: $el.find(".j-product").data("skuid"),
      itemName: $el.find(".sx-item-title").text(),
      img: $el.find("img").attr("src"),
      itemUrl,
      currentPrice,
      originalPrice: isNaN(originalPrice) ? null : originalPrice,
      discounted: !isNaN(originalPrice),
      inStock: true,
      category
    };
  };
}

function parseItems($) {
  const category = $(".sx-breadcrumbs.sx-breadcrumbs-middle a")
    .get()
    .map(x => $(x).text())
    .join(" > ")
    .replace("Úvod > Eshop > ", "");
  return $(".j-products .j-item").get().map(parseItem($, category));
}

/**
 * Creates Page Function for scraping
 * @param {RequestQueue} requestQueue
 * @param {S3Client} s3
 * @returns {CheerioHandlePage}
 */
async function pageFunction(requestQueue, s3) {
  const processedIds = new Set();

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handler(context) {
    const { request, response, page } = context;
    const { step, category, currentPage } = request.userData;
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
      for (const detail of unprocessedProducts) {
        const slug = await s3FileName(detail);
        requests.push(
          Apify.pushData({ ...detail, slug }),
          uploadToS3(
            s3,
            "tetadrogerie.cz",
            slug,
            "jsonld",
            toProduct(detail, { priceCurrency: "CZK" })
          )
        );

        // remember processed product IDs
        processedIds.add(detail.itemId);
      }
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
    maxRequestRetries = 3,
    maxConcurrency = 10
  } = input ?? {};

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  if (development) {
    await requestQueue.addRequest({
      url: "https://www.tetadrogerie.cz/eshop/produkty/uklid/uklidove-pomucky/smetaky-kostata-a-rejzaky"
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
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "tetadrogerie.cz");
    log.info("invalidated Data CDN");

    await uploadToKeboola("teta_cz");
  }
  log.info("Finished.");
});
