import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Actor, log, LogLevel } from "apify";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { gql } from "graphql-tag";
import { Dataset, HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const PAGE_LIMIT = 80;
const GET_CAMPAIGN = gql`
  query getCampaningForList(
    $campaignId: String!
    $categoryUrlKey: String
    $pagination: ProductCollectionPaginationInput
    $allFilters: Boolean = false
    $filters: [ProductFilterValueInput!]
    $productSorting: String = null
    $previewHash: String = ""
    $abTestVariant: String = ""
    $isMobile: Boolean = false
    $bannersPage: String = ""
    $includeBonusSets: Boolean = false
  ) {
    getCampaign(
      campaignId: $campaignId
      query: {
        previewHash: $previewHash
        abTestVariant: $abTestVariant
        bannersPage: $bannersPage
        isMobile: $isMobile
      }
    ) {
      id
      name
      showProductCounter
      showActionPrice
      validTo
      validFrom

      productCollection(
        query: {
          categoryUrlKey: $categoryUrlKey
          pagination: $pagination
          filters: $filters
          allFilters: $allFilters
          productSorting: $productSorting
          includeBonusSets: $includeBonusSets
        }
      ) {
        itemsTotalCount
        items {
          ... on Product {
            id
            title
            mainVariant {
              id
              price
              title
              hasSale
              isAvailable
              inPromotion
              originalSalePrice
              discountPromotionSalePrice
              rrpSavePercent
              discountPrice
              discountPromotionPrice
              defaultActualPrice
              promotionPrice
              promotionEnd
              pricePerUnit {
                value
                measure
              }
              priceType
              priceRrp
              mediaIds
              mainMenuPath
            }
            mainCategoryUrlKey
            urlKey
          }
        }
      }
    }
  }
`;

function getVariables(page) {
  return {
    "allFilters": false,
    "productSorting": null,
    "isMobile": true,
    "bannersPage": "/kampan/black-friday",
    "includeBonusSets": false,
    "campaignId": "black-friday",
    "filters": [],
    "pagination": {
      "limit": PAGE_LIMIT,
      "offset": (page - 1) * PAGE_LIMIT
    }
  };
}

function getPayload(page) {
  return JSON.stringify({
    query: GET_CAMPAIGN.loc.source.body,
    variables: getVariables(page)
  });
}

function createRequest(country, page) {
  const tld = country.toLowerCase();
  return {
    url: `https://www.mall.${tld}/web-gateway/graphql`,
    uniqueKey: `https://www.mall.${tld}/web-gateway/graphql?page=${page}`,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    payload: getPayload(page),
    userData: { page }
  };
}

function extractProduct(item, country) {
  const tld = country.toLowerCase();
  const { mainVariant } = item;
  return {
    itemId: mainVariant.id,
    itemUrl: `https://www.mall.${tld}/${item.mainCategoryUrlKey}/${item.urlKey}`,
    itemName: mainVariant.title,
    img: `https://www.mall.${tld}/i/${mainVariant.mediaIds[0]}/550/550`,
    category: mainVariant.mainMenuPath.join(" > "),
    currency: country === "CZ" ? "CZK" : "EUR",
    originalPrice: mainVariant.priceRrp,
    get discounted() {
      return this.originalPrice > this.currentPrice;
    },
    currentPrice: mainVariant.price,
    inStock: mainVariant.isAvailable,
    useUnitPrice: mainVariant.pricePerUnit?.measure?.includes("cca") ?? false,
    currentUnitPrice: mainVariant.pricePerUnit?.value ?? null,
    quantity: mainVariant.pricePerUnit?.measure ?? null
  };
}

async function main() {
  const rollbar = Rollbar.init();

  const input = await Actor.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "CZ",
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.BlackFriday,
    debug = true
  } = input ?? {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const processedIds = new Set();
  const stats = await withPersistedStats(x => x, {
    ok: 0,
    denied: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0
  });

  const requestQueue = await Actor.openRequestQueue();

  if (new Set([ActorType.BlackFriday, ActorType.Test]).has(type)) {
    const page = 1;
    await requestQueue.addRequest(createRequest(country, page));
  } else {
    throw new Error(`ActorType ${type} not yet implemented`);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100,
      persistStateKeyValueStoreId: "mall-sessions",
      sessionOptions: {
        maxUsageCount: 50
      }
    },
    async requestHandler({ request, response, json, session }) {
      if (response.statusCode === 403) {
        stats.inc("denied");
        session.isBlocked();
        throw new Error("Access Denied");
      }
      if (response.statusCode === 200) stats.inc("ok");
      session.setCookiesFromResponse(response);

      stats.inc("pages");
      const { page = 1 } = request.userData || {};
      log.debug(`We are on ${page} page`);

      const { data: { getCampaign: data } = {}, errors } = json;
      if (errors) log.error("GraphQL errors", errors);

      const { productCollection: { items = [] } = {}, ...rest } = data || {};
      log.debug(`Got ${items.length} items now`);

      if (!items.length) {
        log.warning("No items 🤔", rest);
      }

      const hasMorePages = items.length === PAGE_LIMIT;
      log.debug(hasMorePages ? "Has more pages." : "That was last page");

      if (hasMorePages && type !== ActorType.Test) {
        await requestQueue.addRequest(createRequest(country, page + 1));
      }

      for (const item of items) {
        const product = extractProduct(item, country);

        if (!processedIds.has(product.itemId)) {
          processedIds.add(product.itemId);
          await Dataset.pushData(product);
          stats.inc("items");
        } else {
          stats.inc("itemsDuplicity");
        }
      }
    },
    async failedRequestHandler({ request, error }) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  await stats.save(true);

  log.info("invalidated Data CDN");
  if (type !== ActorType.Test && !development) {
    let tableName = country === "CZ" ? "mall" : "mall_sk";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }

    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main);
