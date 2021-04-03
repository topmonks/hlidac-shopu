const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  CloudFrontClient,
  CreateInvalidationCommand
} = require("@aws-sdk/client-cloudfront");
const Apify = require("apify");
const { URLSearchParams } = require("url");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */
/** @typedef { import("schema-dts").Product} Product */

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

/**
 *
 * @param {RequestQueue} requestQueue
 * @param categories
 * @returns {Promise<void>}
 */
async function enqueueCategories(requestQueue, { categories }) {
  for (const url of categoriesTree(categories)) {
    await requestQueue.addRequest({
      url,
      userData: { step: "DETAIL" }
    });
  }
}

/**
 *
 * @param {RequestQueue} requestQueue
 * @param products
 * @returns {Promise<void>}
 */
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
  discountedName:
    item.percentageDiscount > 0 ? `${item.percentageDiscount} %` : null,
  currentPrice: item.price,
  originalPrice:
    item.price == item.recommendedPrice ? null : item.recommendedPrice,
  inStock: !item.firstOrderDay,
  category: breadcrumbs,
  img: item.image
});

/**
 *
 * @param detail
 * @returns {Product}
 */
const toProduct = detail => ({
  "@scope": "https://schema.org/",
  "@type": "Product",
  sku: detail.itemId,
  name: detail.itemName,
  url: detail.itemUrl,
  image: detail.img,
  category: detail.category,
  offers: {
    "@type": "Offer",
    availability: `https://schema.org/${
      detail.inStock ? "InStock" : "OutOfStock"
    }`,
    price: detail.currentPrice,
    priceCurrency: "CZK"
  }
});

/**
 * @param {S3Client} s3
 * @param {string} shop
 * @param {string} fileName
 * @param {string} ext
 * @param {*} data
 * @returns {Promise<void>}
 */
async function uploadToS3(s3, shop, fileName, ext, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: `products/${shop}/${fileName}.${ext}`,
      ContentType: `application/${ext}`,
      Body: JSON.stringify(data)
    })
  );
}

function s3FileName(detail) {
  const url = new URL(detail.itemUrl);
  return url.pathname.match(/[^/]+$/)?.[0];
}

/**
 *
 * @param {CloudFrontClient} cloudfront
 * @param {string} distributionId
 * @param {string} shop
 * @returns {Promise<void>}
 */
async function invalidateCDN(cloudfront, distributionId, shop) {
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: { Items: [`/products/${shop}/*`], Quantity: 1 },
        CallerReference: new Date().getTime().toString()
      }
    })
  );
}

/**
 * @param {RequestQueue} requestQueue
 * @param {S3Client} s3
 * @returns {CheerioHandlePage}
 */
function pageFunction(requestQueue, s3) {
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
        const detail = parseItem(item, breadcrumbs);
        await Promise.all([
          Apify.pushData(detail),
          uploadToS3(
            s3,
            "kosik.cz",
            s3FileName(detail),
            "jsonld",
            toProduct(detail)
          )
        ]);
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
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

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
    maxRequestRetries: 1,
    requestTimeoutSecs: 60,
    additionalMimeTypes: ["application/json", "text/plain"],
    handlePageFunction: pageFunction(requestQueue, s3),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "kosik.cz");
  log.info("invalidated Data CDN");

  try {
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
