const Apify = require("apify");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

const slug = url => url.substring(1);
const listingUrl = ({ url }) =>
  `https://www.kosik.cz/api/web/page/products?slug=${slug(url)}&limit=60`;

function* categoriesTree(root) {
  for (const category of root) {
    if (category.subcategories) yield* categoriesTree(category.subcategories);
    yield listingUrl(category);
  }
}

async function enqueueCategories(requestQueue, { categories }) {
  for (const url of categoriesTree(categories)) {
    await requestQueue.addRequest({
      url,
      userData: { step: "DETAIL" }
    });
  }
}

async function enqueuePagination(requestQueue, { products }) {
  if (products?.more) {
    await requestQueue.addRequest({
      url: products.more,
      userData: { step: "DETAIL" }
    });
  }
}

const parseItem = (item, breadcrumbs) => ({
  itemId: item.id,
  itemUrl: "https://www.kosik.cz/" + item.url,
  itemName: item.name,
  discounted: item.percentageDiscount > 0,
  currentPrice: item.price,
  originalPrice: item.recommendedPrice,
  inStock: !item.firstOrderDay,
  category: breadcrumbs,
  img: item.image
});

/**
 * @param {RequestQueue} requestQueue
 * @returns {CheerioHandlePage}
 */
function pageFunction(requestQueue) {
  const processedIds = new Set();

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handlePageFunction(context) {
    const { request, response, json } = context;
    if (response.statusCode !== 200) {
      log.info("Status code:", response.statusCode);
    }

    const { step } = request.userData;
    if (step === "CATEGORIES") {
      await enqueueCategories(requestQueue, json);
    } else if (step === "DETAIL") {
      await enqueuePagination(requestQueue, json);

      const breadcrumbs =
        json.breadcrumbs?.map(x => x.name)?.join(" > ") ?? json.title;
      for (const item of json.products.items) {
        if (processedIds.has(item.id)) continue;
        await Apify.pushData(parseItem(item, breadcrumbs));
        processedIds.add(item.id);
      }
    }

    log.info("handled page", { url: request.url });
  }

  return handlePageFunction;
}

function getTableName(country) {
  return `kosik`;
}

async function uploadToKeboola(tableName) {
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
}

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    country = "cz",
    development,
    maxConcurrency = 4,
    proxyGroups = ["CZECH_LUMINATI"],
    type
  } = input ?? {};

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  // TODO: if (type === "BF")
  await requestQueue.addRequest({
    url: "https://www.kosik.cz/api/web/menu/main",
    userData: {
      step: "CATEGORIES"
    }
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    handlePageFunction: pageFunction(requestQueue),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  try {
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
