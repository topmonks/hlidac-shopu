import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { gotScraping } from "got-scraping";
// import { paginationParser } from "./paginationParser.js";
// import { extractItems, extractBfItems } from "./detailParser.js";
import cheerio from "cheerio";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { gql } from "graphql-tag";

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

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

Apify.main(async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "CZ",
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.BF,
    debug = false,
    test = false
  } = input ?? {};

  if (debug) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    // categories: 0,
    pages: 0,
    items: 0
  };

  const requestQueue = await Apify.openRequestQueue();

  if (type === ActorType.BF) {
    await requestQueue.addRequest({
      url: `https://www.mall.${country.toLowerCase()}/web-gateway/graphql`
    });
  } else {
    throw new Error(`ActorType ${type} not yet implemented`);
  }

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    //proxyConfiguration,
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
    handleRequestFunction: async ({ request, session }) => {
      stats.pages++;
      const PAGE_LIMIT = 80;
      const { page = 1 } = request.userData || {};
      log.debug(`We are on ${page} page`);

      const variables = {
        "allFilters": false,
        "productSorting": null,
        "isMobile": true,
        "bannersPage": "/kampan/black-friday",
        "includeBonusSets": false,
        "campaignId": "black-friday",
        "filters": [],
        "pagination": {
          "limit": PAGE_LIMIT,
          "offset": page * PAGE_LIMIT - PAGE_LIMIT
        }
      };

      const {
        body: { data: { getCampaign: data } = {}, errors }
      } = await gotScraping(request.url, {
        responseType: "json",
        method: "POST",
        headers: {
          // "X-App-Token": token, // no need on mall
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: GET_CAMPAIGN.loc.source.body,
          variables
        })
      });
      if (errors) {
        log.error("GraphQL errors", errors);
      }

      const {
        productCollection: { items }
      } = data;
      log.debug(`Got ${items.length} items now`);

      const hasMorePages = items.length === PAGE_LIMIT;
      log.debug(hasMorePages ? "Has more pages." : "That was last page");

      if (hasMorePages) {
        await requestQueue.addRequest({
          url: `https://www.mall.${country.toLowerCase()}/web-gateway/graphql`,
          userData: {
            page: page + 1
          },
          uniqueKey: `Query of ${page}. page`
        });
      }

      const promises = [];
      for (const item of items) {
        const product = {
          "itemId": item.mainVariant.id,
          "itemUrl": `https://www.mall.${country.toLowerCase()}/${
            item.mainCategoryUrlKey
          }/${item.urlKey}`,
          "itemName": item.mainVariant.title,
          "img": `https://www.mall.${country.toLowerCase()}/i/${
            item.mainVariant.mediaIds[0]
          }/550/550`,
          "category": item.mainVariant.mainMenuPath.join(" > "),
          "currency": country === "CZ" ? "CZK" : "EUR",
          "originalPrice": item.mainVariant.priceRrp,
          get discounted() {
            return this.originalPrice > this.currentPrice;
          },
          "currentPrice": item.mainVariant.price,
          "inStock": item.mainVariant.isAvailable,
          "useUnitPrice":
            item.mainVariant.pricePerUnit?.measure.includes("cca"),
          "currentUnitPrice": item.mainVariant.pricePerUnit?.value,
          "quantity": item.mainVariant.pricePerUnit?.measure
        };

        if (!processedIds.has(product.itemId)) {
          processedIds.add(product.itemId);
          promises.push(Apify.pushData(product));
          if (!development) {
            promises.push(
              uploadToS3v2(s3, product, {
                priceCurrency: product.currency,
                inStock: product.inStock
              })
            );
          }
          stats.items++;
        } else {
          stats.itemsDuplicity++;
        }
      }
      // await all requests, so we don't end before they end
      await Promise.all(promises);
    },
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  console.log("Crawling finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  await invalidateCDN(
    cloudfront,
    "EQYSHWUECAQC9",
    `mall.${country.toLowerCase()}`
  );
  log.info("invalidated Data CDN");
  if (!test && !development) {
    let tableName = country === "CZ" ? "mall" : "mall_sk";
    if (type === ActorType.BF) {
      tableName = `${tableName}_bf`;
    }

    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }
});
