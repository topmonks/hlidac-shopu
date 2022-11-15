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

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

function getBaseUrl(country) {
  switch (country) {
    case COUNTRY.CZ:
      return "https://www.okay.cz";
    case COUNTRY.SK:
      return "https://www.okay.sk";
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

const INTERESTED_TAGS = {
  [ActorType.TEST]: {
    [COUNTRY.CZ]: ["COL1:1573"],
    [COUNTRY.SK]: ["COL1:2102"]
  },
  [ActorType.BF]: {
    [COUNTRY.CZ]: ["BDT:Black Friday#1{2581}", "BDT:Black Friday#1{2583}"],
    [COUNTRY.SK]: ["BDT:Black Friday#1{2589}", "BDT:Black Friday#1{2590}"]
  },
  [ActorType.FULL]: {
    [COUNTRY.CZ]: null,
    [COUNTRY.SK]: null
  }
};

function getInterestedTags(type, country) {
  return INTERESTED_TAGS[type][country];
}

function getCurrency(country) {
  switch (country) {
    case COUNTRY.CZ:
      return "CZK";
    default:
      return "EUR";
  }
}

async function enqueueRequests(requestQueue, country, stats, params) {
  const endpointUrl = "https://services.mybcapps.com/bc-sf-filter/filter";
  const shop = getShopUri(country);

  const nextParams = Object.assign({}, params, {
    shop,
    limit: 70,
    sort: "price-ascending",
    product_available: false,
    variant_available: false,
    check_cache: false,
    sort_first: "available"
  });

  const { tag: tags, ...otherParams } = nextParams;
  const searchParams = new URLSearchParams(otherParams);

  if (Array.isArray(tags)) {
    for (let tag of tags) {
      await requestQueue.addRequest({
        uniqueKey: `Products of "${tag}" tag on ${params.page}. page`,
        url: `${endpointUrl}?${searchParams}&tag=${encodeURIComponent(tag)}`,
        userData: {
          endpointUrl,
          params: nextParams
        }
      });
    }
  } else {
    await requestQueue.addRequest({
      uniqueKey: `All products on ${params.page}. page`,
      url: `${endpointUrl}?${searchParams}`,
      userData: {
        endpointUrl,
        params: nextParams
      }
    });
  }
}

const processedIds = new Set();

async function handleResponse(
  responseData,
  country,
  requestQueue,
  params,
  endpointUrl,
  stats,
  s3
) {
  const requests = [];
  for (const product of responseData.products) {
    const item = {
      itemId: product.id,
      itemUrl: `${getBaseUrl(country)}/products/${product.handle}`,
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
  await Promise.all(requests);

  const paginationCount = Math.ceil(responseData.total_product / params.limit);
  if (paginationCount > 1 && params.page === 1) {
    log.info(`Adding ${paginationCount - 1}x pagination pages `);
    for (let page = 2; page <= paginationCount; page++) {
      await enqueueRequests(
        requestQueue,
        country,
        stats,
        Object.assign({}, params, { page })
      );
    }
  }
}

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
    customTableName = null
  } = input ?? {};

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();

  await enqueueRequests(requestQueue, country, stats, {
    page: 1,
    tag: getInterestedTags(type, country)
  });

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
      const { endpointUrl, params } = request.userData;

      log.debug(`Processing ${params.page}. page: ${request.url}`);
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
      return handleResponse(
        responseData,
        country,
        requestQueue,
        params,
        endpointUrl,
        stats,
        s3
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
    const rootUrl = getBaseUrl(country);
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
