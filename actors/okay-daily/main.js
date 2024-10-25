import { URLSearchParams } from "url";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";
import { calculateTagSalePrice } from "./index.js";

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/**
 * @param {Country} country
 */
function getBaseUrl(country) {
  switch (country) {
    case Country.CZ:
      return "https://www.okay.cz";
    case Country.SK:
      return "https://www.okay.sk";
  }
}

/**
 * @param {Country} country
 */
function getShopUri(country) {
  switch (country) {
    case Country.CZ:
      return "okay-elektro-cz.myshopify.com";
    case Country.SK:
      return "okay-dev-sk.myshopify.com";
  }
}

const INTERESTED_TAGS = {
  [ActorType.Test]: {
    [Country.CZ]: ["COL1:1573"],
    [Country.SK]: ["COL1:2102"]
  },
  [ActorType.BlackFriday]: {
    [Country.CZ]: [
      "BDT:Black Friday#1{4921}",
      "BDT:Black Friday#1{4916}",
      "BDT:Black Friday#1{4923}",
      "BDT:Black Friday#1{5181}",
      "BDT:Black Friday#1{4912}",
      "BDT:Black Friday#1{5184}",
      "BDT:Black Friday#1{4909}",
      "BDT:Black Friday#1{5182}",
      "BDT:Black Friday#1{5185}"
    ],
    [Country.SK]: [
      "BDT:Black Friday#1{4947}",
      "BDT:Black Friday#1{4960}",
      "BDT:Black Friday#1{5191}",
      "BDT:Black Friday#1{5120}",
      "BDT:Black Friday#1{4949}",
      "BDT:Black Friday#1{5192}",
      "BDT:Black Friday#1{5066}",
      "BDT:Black Friday#1{5194}",
      "BDT:Black Friday#1{5119}",
      "BDT:Black Friday#1{5195}"
    ]
  },
  [ActorType.Full]: {
    [Country.CZ]: null,
    [Country.SK]: null
  }
};

function getInterestedTags(type, country) {
  return INTERESTED_TAGS[type][country];
}

function requests(country, params) {
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

  const requests = [];
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      const url = `${endpointUrl}?${searchParams}&tag=${encodeURIComponent(tag)}`;
      log.info(`Requesting ${url}`);
      requests.push({
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
    requests.push({
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
  return requests;
}

function extractProducts({ json, country }) {
  return json.products.map(product => {
    const productWithSale = calculateTagSalePrice(structuredClone(product));
    const maxPrice = Math.max(product.compare_at_price_max, product.price_max); // use crossed out price if available
    const inStock = product.available;

    // Prices are included without VAT in the data. We need to calculate the VAT from the tags.
    const vat = parseInt(product.original_tags?.find(tag => tag.startsWith("PRD:Tax-"))?.split('-')?.[1] || 0, 10);

    const currentPrice = productWithSale.price_min * (1 + vat / 100);
    // TODO: Does the comment still hold?
    // Sold out products don't show original price. For compatibility reason, use current price even if there is no discount.
    const originalPrice = (inStock ? maxPrice : currentPrice) * (1 + vat / 100);
    
    return {
      itemId: product.id,
      itemUrl: `${getBaseUrl(country)}/products/${product.handle}`,
      img: product.images["1"],
      itemName: product.title,
      originalPrice: country === Country.CZ ? Math.round(originalPrice) : originalPrice,
      currentPrice: country === Country.CZ ? Math.round(currentPrice) : currentPrice,
      get discounted() {
        return this.currentPrice < this.originalPrice;
      },
      currency: country === Country.CZ ? "CZK" : "EUR",
      category: product.product_type,
      inStock
    };
  });
}

async function saveProducts({ stats, products, processedIds }) {
  stats.add("totalItems", products.length);
  const requests = [];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(Dataset.pushData(product));
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  await Promise.all(requests);
}

async function enqueueMoreRequests({ json, params, log, requestQueue, country }) {
  const paginationCount = Math.ceil(json.total_product / params.limit);
  if (!(paginationCount > 1 && params.page === 1)) return;

  log.info(`Adding ${paginationCount - 1}x pagination pages `);
  const paginationRequests = restPageUrls(paginationCount, page =>
    requests(country, Object.assign({}, params, { page }))
  );
  await requestQueue.addRequests(paginationRequests);
}

async function main() {
  const rollbar = Rollbar.init();

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    totalItems: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const {
    development,
    proxyGroups,
    maxRequestRetries,
    country = Country.CZ,
    type = ActorType.Full,
    customTableName = null
  } = await getInput();

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const processedIds = new Set();

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    async requestHandler({ request, json, log, crawler }) {
      const { params } = request.userData;
      stats.inc("urls");

      log.info(`Processing ${params.page}. page: ${request.url}`);
      const products = extractProducts({
        json,
        country
      });
      await saveProducts({ stats, products, processedIds });
      await enqueueMoreRequests({
        json,
        params,
        log,
        requestQueue: crawler.requestQueue,
        country
      });
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, request);
      rollbar.error(error, request);
      stats.inc("failed");
    }
  });

  await crawler.run(
    requests(country, {
      page: 1,
      tag: getInterestedTags(type, country)
    })
  );
  await stats.save(true);

  if (!development) {
    const rootUrl = getBaseUrl(country);
    const suffix = type === ActorType.BlackFriday ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
