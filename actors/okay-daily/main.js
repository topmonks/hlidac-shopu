import { URLSearchParams } from "url";
import Apify from "apify";
import { gotScraping } from "got-scraping";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";

const {
  utils: { log }
} = Apify;

const BASE_URL_CZ = "https://www.okay.cz";
const BASE_URL_SK = "https://www.okay.sk";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const LABEL = {
  COLLECTION: "COLLECTION",
  COLLECTIONS: "COLLECTIONS",
  LIST: "LIST"
};

const TYPE = {
  BF: "BF",
  TEST: "TEST",
  FULL: "FULL"
};

function getBaseUrl(country) {
  switch (country) {
    case COUNTRY.CZ:
      return BASE_URL_CZ;
    case COUNTRY.SK:
      return BASE_URL_SK;
  }
}

function getShopUri(country) {
  switch (country.toUpperCase()) {
    case COUNTRY.CZ:
      return "okay-elektro-cz.myshopify.com";
    case COUNTRY.SK:
      return "okay-dev-sk.myshopify.com";
  }
}

function getCurrency(country) {
  switch (country) {
    case COUNTRY.CZ:
      return "CZK";
    default:
      return "EUR";
  }
}

async function handleCollections(
  responseData,
  country,
  requestQueue,
  params,
  defaultUrl
) {
  if (responseData.collections.length <= 0) return;
  const shop = getShopUri(country);
  for (const collection of responseData.collections) {
    const newParams = {
      shop,
      page: 1,
      limit: 50,
      sort: "price-ascending",
      collection_scope: collection.id,
      product_available: false,
      variant_available: false,
      check_cache: false,
      sort_first: "available"
    };
    const url = `https://services.mybcapps.com/bc-sf-filter/filter?${new URLSearchParams(
      newParams
    )}`;
    await requestQueue.addRequest({
      url,
      userData: {
        label: "COLLECTION",
        title: collection.title,
        params: newParams
      }
    });
  }
  log.info(`Found ${responseData.collections.length}x collections`);
  params.page += 1;
  await requestQueue.addRequest(
    {
      url: `${defaultUrl}?${new URLSearchParams(params)}`,
      userData: {
        label: LABEL.COLLECTIONS,
        defaultUrl,
        params
      }
    },
    { forefront: false }
  );
}

async function handleCollection(
  responseData,
  params,
  rootUrl,
  country,
  crawlContext,
  s3,
  requestQueue,
  title
) {
  const paginationCount = Math.ceil(responseData.total_product / params.limit);
  log.info(`Found ${responseData.products.length}x products`);
  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  for (const product of responseData.products) {
    if (!product.id || !product.price_max) continue;
    const item = {
      itemId: product.id,
      itemUrl: `${rootUrl}/products/${product.handle}`,
      img: product.images["1"],
      itemName: product.title,
      originalPrice:
        product.compare_at_price_max === 0
          ? product.price_max
          : product.compare_at_price_max,
      currentPrice: product.price_max,
      discounted: product.compare_at_price_max > product.price_max,
      currency: getCurrency(country),
      category: product.product_type,
      inStock: product.available
    };

    crawlContext.stats.totalItems += 1;
    if (!processedIds.has(item.itemId)) {
      processedIds.add(item.itemId);
      requests.push(Apify.pushData(item), uploadToS3v2(s3, item));
      crawlContext.stats.items += 1;
    } else {
      crawlContext.stats.itemsDuplicity += 1;
    }
  }
  log.info(`Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);

  if (paginationCount > 1 && params.page === 1) {
    log.info(`Adding ${paginationCount - 1}x pagination pages `);
    for (let i = 2; i <= paginationCount; i++) {
      params.page = i;
      const url = `https://services.mybcapps.com/bc-sf-filter/filter?${new URLSearchParams(
        params
      )}`;
      await requestQueue.addRequest(
        {
          url,
          userData: {
            label: LABEL.COLLECTION,
            title,
            params
          }
        },
        { forefront: true }
      );
    }
  }
}

async function enqueueRequests(
  requestQueue,
  type,
  rootUrl,
  bfUrls,
  crawlContext
) {
  switch (type) {
    case TYPE.BF:
      for (const url of bfUrls) {
        await requestQueue.addRequest({
          url,
          userData: { label: LABEL.LIST }
        });
        crawlContext.stats.urls += 1;
      }
      break;
    case TYPE.TEST:
      await requestQueue.addRequest({
        url: "https://www.okay.cz/tv-s-uhloprickou-55-139-cm/",
        userData: { label: LABEL.LIST }
      });
      break;
    case TYPE.FULL:
      const params = { page: 1 };
      const url = `${rootUrl}/collections?${new URLSearchParams(params)}`;
      await requestQueue.addRequest({
        url,
        userData: {
          label: LABEL.COLLECTIONS,
          defaultUrl: `${rootUrl}/collections`,
          params
        }
      });
      break;
  }
}

async function processData(
  label,
  responseData,
  country,
  requestQueue,
  params,
  defaultUrl,
  rootUrl,
  crawlContext,
  s3,
  title
) {
  switch (label) {
    case "COLLECTIONS":
      return await handleCollections(
        responseData,
        country,
        requestQueue,
        params,
        defaultUrl
      );
    case "COLLECTION":
      return await handleCollection(
        responseData,
        params,
        rootUrl,
        country,
        crawlContext,
        s3,
        requestQueue,
        title
      );
  }
}

const processedIds = new Set();

Apify.main(async () => {
  rollbar.init();

  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const s3 = new S3Client({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = TYPE.FULL,
    debug = false,
    development = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5,
    maxRequestRetries = 3,
    bfUrls = [],
    customTableName = null
  } = input ?? {};

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const rootUrl = getBaseUrl(country);
  const crawlContext = await withPersistedStats(stats => ({
    requestQueue,
    baseUrl: rootUrl,
    development,
    stats,
    country
  }));

  await enqueueRequests(requestQueue, type, rootUrl, bfUrls, crawlContext);
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    async handleRequestFunction(context) {
      const { request, session } = context;
      const { defaultUrl, label, title, params } = request.userData;

      log.info(`Processing ${label}: ${request.url}`);
      const requestOptions = {
        url: request.url,
        proxyUrl: proxyConfiguration.newUrl(session.id),
        throwHttpErrors: false,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // If you want to use the cookieJar.
          // This way you get the Cookie headers string from session.
          Cookie: session.getCookieString()
        }
      };

      const response = await gotScraping(requestOptions);

      // Status code check
      if (![200, 404].includes(response.statusCode)) {
        session.retire();
        request.retryCount--;
        throw new Error(`We got blocked by target on ${request.url}`);
      }

      const responseData = JSON.parse(response.body);
      return await processData(
        label,
        responseData,
        country,
        requestQueue,
        params,
        defaultUrl,
        rootUrl,
        crawlContext,
        s3,
        title
      );
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();

  log.info("Crawl finished.");

  await crawlContext.stats.save();

  if (!development) {
    const suffix = type === TYPE.BF ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await Promise.allSettled([
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(rootUrl)),
      uploadToKeboola(tableName)
    ]);
    log.info(`invalidated Data CDN: ${shopOrigin(rootUrl)}`);
    log.info(`upload to Keboola finished: ${tableName}`);
  }

  log.info("ACTOR - Finished");
});
