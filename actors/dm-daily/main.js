const Apify = require("apify");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

const COUNTRY = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  DE: "DE",
  AT: "AT"
};

const makeListingUrl = (
  countryCode,
  productQuery,
  currentPage,
  pageSize = 100
) =>
  `https://products.dm.de/product/${countryCode.toLowerCase()}/search?${new URLSearchParams(
    {
      productQuery,
      currentPage,
      pageSize,
      purchasableOnly: false,
      hideFacets: false,
      hideSorts: true
    }
  )}`;

const createProductUrl = (country, url) =>
  `https://dm.${country.toLowerCase()}${url}`;

function* traverseCategories(categories, names = []) {
  for (const category of categories) {
    if (category.subcategories) {
      yield* traverseCategories(category.subcategories, [
        ...names,
        category.name
      ]);
    } else {
      names = [...names, category.name];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
  }
}

function* paginateResults(category) {
  const length = Math.ceil(category.count / 100);
  for (let i = 1; i <= length; i++) {
    yield i;
  }
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
    const { body, contentType, request, response, json } = context;
    const { country, step, category } = request.userData;
    if (response.statusCode !== 200) {
      return log.info(body.toString(contentType.encoding));
    }

    const { pagination, products, categories } = json;

    if (step === "START") {
      log.info("Pagination info", pagination);
      // we are traversing recursively from leaves to trunk
      for (const category of traverseCategories(categories)) {
        for (const page of paginateResults(category)) {
          // we need to await here to prevent higher categories
          // to be enqueued sooner than sub-categories
          await requestQueue.addRequest({
            url: makeListingUrl(country, category.productQuery, page),
            userData: {
              country,
              category: category.breadcrumbs
            }
          });
        }
      }
    } else {
      // we don't need to block pushes, we will await them all at the end
      const requests = [];
      // push only unique items
      const unprocessedProducts = products.filter(
        p => !processedIds.has(p.gtin)
      );
      requests.push(
        Apify.pushData(
          unprocessedProducts.map(p => ({
            itemId: p.gtin,
            itemName: `${p.brandName} ${p.name}`,
            itemUrl: createProductUrl(
              country,
              p.links
                .filter(x => x.rel === "self")
                .map(x => x.href)
                .pop()
            ),
            img: p.links
              .filter(x => x.rel.startsWith("productimage"))
              .map(x => x.href)
              .pop(),
            currentPrice: p.price,
            originalPrice: p.selloutPrice,
            currency: p.priceCurrencyIso,
            category,
            discounted: p.isSellout
          }))
        )
      );

      // mark newly proceeded product IDs
      for (const id of unprocessedProducts.map(x => x.gtin)) {
        processedIds.add(id);
      }

      // await all requests, so we don't end before they end
      await Promise.all(requests);
    }
  }
  return handler;
}

function getTableName(country) {
  return `dm_${country.toLowerCase()}`;
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
  const input = await Apify.getInput();

  const { country = COUNTRY.CZ, productQuery = ":allCategories" } = input || {};

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({
    url: makeListingUrl(country, productQuery, 1, 1),
    userData: {
      country,
      productQuery,
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
    additionalMimeTypes: ["application/json", "text/plain"],
    handlePageFunction: pageFunction(requestQueue),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await uploadToKeboola(getTableName(country));
  log.info("Finished.");
});
