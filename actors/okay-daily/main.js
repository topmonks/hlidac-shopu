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
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

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
  defaultUrl,
  stats
) {
  if (responseData.collections.length <= 0) return;
  const shop = getShopUri(country);
  for (const collection of responseData.collections) {
    const filters = new URLSearchParams({
      shop,
      page: 1,
      limit: 50,
      sort: "price-ascending",
      collection_scope: collection.id,
      product_available: false,
      variant_available: false,
      check_cache: false,
      sort_first: "available"
    });
    const url = `https://services.mybcapps.com/bc-sf-filter/filter?${filters}`;
    await requestQueue.addRequest({
      url,
      userData: {
        label: "COLLECTION",
        title: collection.title,
        params: filters
      }
    });
  }
  log.debug(`Found ${responseData.collections.length}x collections`);
  stats.add("collections", responseData.collections.length);
  const nextParams = Object.assign({}, params, { page: params.page + 1 });
  await requestQueue.addRequest(
    {
      url: `${defaultUrl}?${new URLSearchParams(nextParams)}`,
      userData: {
        label: LABEL.COLLECTIONS,
        defaultUrl,
        params: nextParams
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
  s3,
  requestQueue,
  title,
  stats
) {
  const paginationCount = Math.ceil(responseData.total_product / params.limit);
  log.debug(`Found ${responseData.products.length}x products`);
  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  const products = responseData.products.filter(p => p.id && p.price_max);
  for (const product of products) {
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

    stats.inc("totalItems");
    if (processedIds.has(item.itemId)) {
      stats.inc("itemsDuplicity");
    } else {
      processedIds.add(item.itemId);
      requests.push(Apify.pushData(item), uploadToS3v2(s3, item));
      stats.inc("items");
    }
  }
  log.debug(`Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.all(requests);

  if (paginationCount > 1 && params.page === 1) {
    log.info(`Adding ${paginationCount - 1}x pagination pages `);
    for (let page = 2; page <= paginationCount; page++) {
      const nextParams = Object.assign({}, params, { page });
      const url = `https://services.mybcapps.com/bc-sf-filter/filter?${new URLSearchParams(
        nextParams
      )}`;
      await requestQueue.addRequest(
        {
          url,
          userData: {
            label: LABEL.COLLECTION,
            title,
            params: nextParams
          }
        },
        { forefront: true }
      );
    }
  }
}

async function handleList(
  responseData,
  params,
  rootUrl,
  country,
  s3,
  requestQueue,
  title,
  stats
) {
  const shop = getShopUri(country);
  const limit = 50;
  const { collection } = responseData;
  const filters = new URLSearchParams({
    shop,
    limit,
    sort: "price-ascending",
    collection_scope: collection.id,
    product_available: false,
    variant_available: false,
    check_cache: false,
    sort_first: "available"
  });
  const url = `https://services.mybcapps.com/bc-sf-filter/filter?${filters}`;

  for (
    let page = 1;
    page <= Math.ceil(collection.products_count / limit);
    page++
  ) {
    await requestQueue.addRequest({
      url,
      userData: {
        label: "COLLECTION",
        title: collection.title,
        params: Object.assign(filters, { page })
      }
    });
  }
}

async function enqueueRequests(requestQueue, type, rootUrl, bfUrls, stats) {
  switch (type) {
    case ActorType.BF:
      for (const url of bfUrls) {
        await requestQueue.addRequest({
          url,
          userData: {
            label: LABEL.LIST
          }
        });
        stats.inc("urls");
      }
      break;
    case ActorType.TEST:
      await requestQueue.addRequest({
        url: "https://www.okay.cz/tv-s-uhloprickou-55-139-cm/",
        userData: { label: LABEL.LIST }
      });
      break;
    case ActorType.FULL:
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
  s3,
  title,
  stats
) {
  switch (label) {
    case LABEL.COLLECTIONS:
      return await handleCollections(
        responseData,
        country,
        requestQueue,
        params,
        defaultUrl,
        stats
      );
    case LABEL.COLLECTION:
      return await handleCollection(
        responseData,
        params,
        rootUrl,
        country,
        s3,
        requestQueue,
        title,
        stats
      );
    case LABEL.LIST:
      return await handleList(
        responseData,
        params,
        rootUrl,
        country,
        s3,
        requestQueue,
        title,
        stats
      );
  }
}

const processedIds = new Set();

Apify.main(async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const stats = await withPersistedStats(x => x, {
    collections: 0,
    urls: 0,
    totalItems: 0,
    items: 0,
    itemsDuplicity: 0
  });

  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = ActorType.FULL,
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

  await enqueueRequests(requestQueue, type, rootUrl, bfUrls, stats);
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

      log.debug(`Processing ${label}: ${request.url}`);
      const response = await gotScraping({
        url: request.url,
        proxyUrl: proxyConfiguration.newUrl(session.id),
        throwHttpErrors: false,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // If you want to use the cookieJar.
          // This way you get the Cookie headers string from session.
          "Cookie": session.getCookieString()
        }
      });

      // Status code check
      if (![200, 404].includes(response.statusCode)) {
        session.retire();
        request.retryCount--;
        throw new Error(`We got blocked by target on ${request.url}`);
      }

      const responseData = JSON.parse(response.body);
      return processData(
        label,
        responseData,
        country,
        requestQueue,
        params,
        defaultUrl,
        rootUrl,
        s3,
        title,
        stats
      );
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();

  log.info("Crawl finished.");

  if (!development) {
    const suffix = type === ActorType.BF ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await Promise.all([
      stats.save(),
      invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(rootUrl)),
      uploadToKeboola(tableName)
    ]);
    log.info(`invalidated Data CDN: ${shopOrigin(rootUrl)}`);
    log.info(`upload to Keboola finished: ${tableName}`);
  }

  log.info("ACTOR - Finished");
});
