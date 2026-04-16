import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { comp, map, mapcat, push, range, transduce } from "@thi.ng/transducers";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */

/**
 * Automatically extracts GraphQL persisted query hashes by intercepting network requests.
 * This function opens Albert.cz pages and captures the hash values from actual GraphQL calls.
 * @returns {Promise<Map<string, string>>} Map of operation names to their sha256 hashes
 */
async function extractPersistedQueryHashes() {
  log.info("Extracting persisted query hashes from Albert.cz...");
  const hashes = new Map();

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 2,
    launchContext: {
      launchOptions: {
        headless: true
      }
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.route("**/*", async route => {
          const url = route.request().url();
          if (url.includes("/api/v1/") && url.includes("extensions")) {
            try {
              const urlObj = new URL(url);
              const operationName = urlObj.searchParams.get("operationName");
              const extensions = urlObj.searchParams.get("extensions");
              if (operationName && extensions) {
                const parsed = JSON.parse(extensions);
                const hash = parsed?.persistedQuery?.sha256Hash;
                if (hash) {
                  hashes.set(operationName, hash);
                  log.info(`Extracted hash for ${operationName}: ${hash}`);
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          await route.continue();
        });
      }
    ],
    async requestHandler({ page }) {
      // Just wait for page to load and trigger GraphQL requests
      await page.waitForTimeout(3000);
    }
  });

  // Visit pages that trigger the GraphQL queries we need
  await crawler.run(["https://www.albert.cz/online", "https://www.albert.cz/shop/Trvale-nizke/c/zeB001"]);

  if (hashes.size === 0) {
    throw new Error("Failed to extract any persisted query hashes");
  }

  log.info(`Successfully extracted ${hashes.size} persisted query hashes`);
  return hashes;
}

const PROCESSED_IDS_KEY = "processedIds";

// Global variable to store dynamically extracted hashes
let opHash = new Map();

/**
 * @param result
 * @param {string} url
 * @param {string} category
 * @returns {Product}
 */
function toProduct(result, { url, category }) {
  const itemId = result.code;
  const itemUrl = new URL(result.url, url).href;
  const itemName = result.name;
  const img = result.images ? new URL(result.images[0].url, url).href : null;
  const currentPrice = result.price.showStrikethroughPrice
    ? cleanPrice(result.price.discountedPriceFormatted)
    : result.price.value;
  const originalPrice = result.price.showStrikethroughPrice ? result.price.value : null;
  const discounted = Boolean(originalPrice) && currentPrice !== originalPrice;
  const currentUnitPrice = result.price.showStrikethroughPrice
    ? cleanPrice(result.price.discountedUnitPriceFormatted.split("=").at(-1))
    : result.price.unitPrice;
  const originalUnitPrice = result.price.showStrikethroughPrice ? result.price.unitPrice : null;
  const unit = result.price.unit;
  const useUnitPrice = unit !== "piece";
  const inStock = result.stock.inStock;
  return {
    slug: itemId,
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    originalPrice,
    currency: "CZK",
    discounted,
    useUnitPrice,
    currentUnitPrice,
    originalUnitPrice,
    unit,
    category,
    inStock
  };
}

function apiQuery(persistedQueryHash, params) {
  params.extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: persistedQueryHash
    }
  };
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "object") {
      params[key] = JSON.stringify(value);
    }
  }
  return `https://www.albert.cz/api/v1/?${new URLSearchParams(params)}`;
}

function gql(operationName, variables) {
  return apiQuery(opHash.get(operationName), { operationName, variables });
}

function getStartUrl() {
  return {
    url: gql("LeftHandNavigationBar", {
      rootCategoryCode: "",
      cutOffLevel: "5",
      lang: "cs"
    }),
    label: "start",
    headers: {
      "content-type": "application/json",
      "apollographql-client-name": "cz-alb-web-stores",
      "apollographql-client-version": "9f7f73067ae74ca1179954e9a94f3a23f1822b6b",
      "x-apollo-operation-name": "LeftHandNavigationBar"
    }
  };
}

function getCategoryProductsUrl(
  category,
  pageNumber = 0,
  pageSize = 20 // previously 50, but Albert client code changed it to 20 so let's do the same
) {
  return {
    url: gql("GetCategoryProductSearch", {
      lang: "cs",
      searchQuery: "",
      category,
      pageNumber,
      pageSize,
      filterFlag: true,
      plainChildCategories: true
    }),
    label: "category",
    userData: { pageNumber, pageSize, categoryCode: category },
    headers: {
      "content-type": "application/json",
      "apollographql-client-name": "cz-alb-web-stores",
      "apollographql-client-version": "9f7f73067ae74ca1179954e9a94f3a23f1822b6b",
      "x-apollo-operation-name": "GetCategoryProductSearch"
    }
  };
}

function getPaginationUrls(category, pagination) {
  return transduce(
    map(i => getCategoryProductsUrl(category, i)),
    push(),
    range(pagination.totalPages)
  );
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    async start({ crawler, json }) {
      if (json.errors) return console.error(json.errors);
      const { categoryTreeList } = json.data.leftHandNavigationBar;

      const urls = transduce(
        comp(
          mapcat(x => x.categoriesInfo),
          map(x => getCategoryProductsUrl(x.categoryCode))
        ),
        push(),
        // reverse the tree, walk it from leafs to root
        categoryTreeList.sort((a, b) => -1 * a.level.localeCompare(b.level))
      );
      await crawler.addRequests(urls);
    },
    async category({ request, json, crawler }) {
      if (json.errors) return console.error(json.errors);

      const { pageNumber, categoryCode } = request.userData;
      const { products, categoryBreadcrumbs, pagination } = json.data.categoryProductSearch;

      if (pageNumber === 0) {
        stats.inc("categories");
        await crawler.addRequests(getPaginationUrls(categoryCode, pagination));
      }

      const category = categoryBreadcrumbs.map(x => x.name).join(" > ");

      for (const product of products) {
        if (processedIds.has(product.code)) {
          stats.inc("duplicates");
          continue;
        }
        await Actor.pushData(toProduct(product, { url: request.url, category }));
        processedIds.add(product.code);
        stats.inc("products");
      }
    }
  });
}

async function main() {
  Rollbar.init();

  // Extract persisted query hashes automatically on startup
  opHash = await extractPersistedQueryHashes();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats({
    categories: 0,
    products: 0,
    duplicates: 0
  });

  const input = await Actor.getInput();
  const {
    debug = false,
    proxyGroups = [],
    type = ActorType.Full,
    urls = [getStartUrl()],
    maxConcurrency = 4,
    maxRequestRetries = 5
  } = input || {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries,
    proxyConfiguration,
    additionalMimeTypes: ["application/json"],
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(urls);

  await stats.save(true);

  const tableName = `albert_cz${type === ActorType.BlackFriday ? "_bf" : ""}`;
  await uploadToKeboola(tableName);
}

await Actor.main(main, { statusMessage: "DONE" });
