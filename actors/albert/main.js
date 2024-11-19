import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { comp, map, mapcat, push, range, transduce } from "@thi.ng/transducers";
import { Actor, LogLevel, log } from "apify";

const PROCESSED_IDS_KEY = "processedIds";

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

// This is map of persisted queriy hashes for given operation.
// When something breaks, it is likely you just have to update the hash here.
// TODO: try to read those from page and store theme for use in the run
const opHash = new Map([
  ["LeftHandNavigationBar", "29a05b50daa7ab7686d28bf2340457e2a31e1a9e4d79db611fcee435536ee01c"],
  ["GetCategoryProductSearch", "dd8d3de806d7e82af7e29b491a30df5a93d2c27c04190ef25ab973cbfe913079"]
]);

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
    label: "start"
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
    userData: { pageNumber, pageSize, categoryCode: category }
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

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    duplicates: 0
  });

  const input = await Actor.getInput();
  const { debug = false, proxyGroups = [], type = ActorType.Full, urls = [getStartUrl()] } = input || {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxConcurrency: 4,
    maxRequestRetries: 5,
    proxyConfiguration,
    additionalMimeTypes: ["application/json"],
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(urls);
  log.info("Crawler finished");

  await stats.save(true);

  const tableName = `albert_cz${type === ActorType.BlackFriday ? "_bf" : ""}`;
  await uploadToKeboola(tableName);

  log.info("Finished.");
}

await Actor.main(main);
