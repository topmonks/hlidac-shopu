import { URLSearchParams } from "url";
import { Actor, log, LogLevel, Dataset } from "apify";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { HttpCrawler } from "@crawlee/http";
import { calculateTagSalePrice } from "./index.js";

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
  [ActorType.Test]: {
    [COUNTRY.CZ]: ["COL1:1573"],
    [COUNTRY.SK]: ["COL1:2102"]
  },
  [ActorType.BF]: {
    [COUNTRY.CZ]: [
      "BDT:Black Friday#1{2655}",
      "BDT:Black Friday#1{2657}",
      "BDT:Black Friday#1{2581}",
      "BDT:Black Friday#3{2425}"
    ],
    [COUNTRY.SK]: [
      "BDT:Black Friday#1{2663}",
      "BDT:Black Friday#1{2665}",
      "BDT:Black Friday#1{2589}"
    ]
  },
  [ActorType.Full]: {
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
      const url = `${endpointUrl}?${searchParams}&tag=${encodeURIComponent(
        tag
      )}`;
      log.debug(`Requesting ${url}`);
      await requestQueue.addRequest({
        uniqueKey: `Products of "${tag}" tag on ${params.page}. page`,
        url,
        userData: {
          endpointUrl,
          params: nextParams
        },
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
    }
  } else {
    const url = `${endpointUrl}?${searchParams}`;
    log.info(`Requesting ${url}`);
    await requestQueue.addRequest({
      uniqueKey: `All products on ${params.page}. page`,
      url,
      userData: {
        endpointUrl,
        params: nextParams
      },
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
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
  log
) {
  for (const product of responseData.products) {
    const productWithSale = calculateTagSalePrice(structuredClone(product));
    const maxPrice = Math.max(product.compare_at_price_max, product.price_max); // use crossed out price if available
    const inStock = product.available;
    const originalPrice = inStock ? maxPrice : currentPrice; // Sold out products doesn't show original price. For compatibility reason, use current price even if there is no discount.
    const currentPrice = productWithSale.price_min;
    const item = {
      itemId: product.id,
      itemUrl: `${getBaseUrl(country)}/products/${product.handle}`,
      img: product.images["1"],
      itemName: product.title,
      originalPrice:
        country === COUNTRY.CZ ? Math.round(originalPrice) : originalPrice,
      currentPrice,
      get discounted() {
        return this.currentPrice < this.originalPrice;
      },
      currency: getCurrency(country),
      category: product.product_type,
      inStock
    };
    if (Math.round(originalPrice) !== originalPrice) {
      console.log("item", originalPrice, item); // TODO: remove!!!
    }

    stats.inc("totalItems");
    if (processedIds.has(item.itemId)) {
      stats.inc("itemsDuplicity");
    } else {
      processedIds.add(item.itemId);
      await Dataset.pushData(item);
      stats.inc("items");
    }
  }
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
async function main() {
  const rollbar = Rollbar.init();

  const stats = await withPersistedStats(x => x, {
    collections: 0,
    urls: 0,
    totalItems: 0,
    items: 0,
    itemsDuplicity: 0
  });

  const input = await Actor.getInput();
  const {
    country = COUNTRY.CZ,
    type = ActorType.Full,
    development = process.env.TEST || process.env.DEBUG,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5,
    maxRequestRetries = 3,
    customTableName = null
  } = input ?? {};

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const requestQueue = await Actor.openRequestQueue();

  await enqueueRequests(requestQueue, country, stats, {
    page: 1,
    tag: getInterestedTags(type, country)
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    proxyConfiguration,
    async requestHandler({ request, json, log }) {
      const { endpointUrl, params } = request.userData;
      stats.inc("urls");

      log.debug(`Processing ${params.page}. page: ${request.url}`);
      return handleResponse(
        json,
        country,
        requestQueue,
        params,
        endpointUrl,
        stats,
        log
      );
    },
    async failedRequestHandler({ request }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  await stats.save(true);

  if (!development) {
    const rootUrl = getBaseUrl(country);
    const suffix = type === ActorType.BlackFriday ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
