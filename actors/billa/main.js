import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, log, LogLevel } from "apify";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";

const PROCESSED_IDS_KEY = "processedIds";

function getCategoryUrls(document) {
  // Get content box with categories listing
  const [section] = Array.from(document.querySelectorAll(".ws-section")).filter(
    x => x.getAttribute("kontentId") === "2feb2433-51b8-016d-e7aa-b2c80256bf18"
  );
  // transform categories URLs to API call of products listing
  return Array.from(section.querySelectorAll(`ul>li>a`) ?? [])
    .map(a => new URL(a.href, "https://shop.billa.cz/").pathname.substring(10))
    .map(
      slug =>
        `https://shop.billa.cz/api/categories/${slug}/products?pageSize=500&page=0`
    );
}

function categoryRequest(url, { page, pageSize } = { page: 0, pageSize: 500 }) {
  return {
    url: url.href ? url.href : url,
    label: "category",
    headers: { "Accept": "application/json" },
    userData: { page, pageSize }
  };
}

function toCZK(price) {
  if (!price) return price;
  return price / 100;
}

function toProduct(result) {
  const itemId = result.sku.replace(/-/g, "");
  const itemUrl = `https://shop.billa.cz/produkt/${result.slug}`;
  const itemName = result.name;
  const breadCrumbs = result.parentCategories[0].map(x => x.name).join(" > ");
  const img = result.images[0];
  const currentPrice = result.price.regular.value;
  const originalPrice = result.price.regular.promotionValue;
  const discounted = Boolean(originalPrice) && currentPrice !== originalPrice;
  const useUnitPrice = result.weightPieceArticle;
  const currentUnitPrice = result.price.regular.perStandardizedQuantity;
  const originalUnitPrice = result.price.regular.promotionValuePerStandardizedQuantity;
  const unit = result.price.baseUnitShort;
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
    breadCrumbs,
    inStock: true
  };
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    async start({ body, crawler }) {
      const { document } = parseHTML(body.toString("utf8"));
      for (const url of getCategoryUrls(document)) {
        await crawler.requestQueue.addRequest(categoryRequest(url));
      }
    },
    async category({ request, json, crawler }) {
      const { page, pageSize } = request.userData;
      const { total, count, results } = json;

      if (page === 0) stats.inc("categories"); // count only first page of category

      if (total > pageSize && count === pageSize) {
        const url = new URL(request.url);
        url.searchParams.set("page", page + 1);
        await crawler.requestQueue.addRequest(
          categoryRequest(url, { page: page + 1, pageSize })
        );
      }

      if (!results) return;
      
      const unprocessedProducts = results.filter(
        x => !processedIds.has(x.productId)
      );
      await Actor.pushData(unprocessedProducts.map(x => toProduct(x)));

      stats.add("products", unprocessedProducts.length);
      for (const { productId } of unprocessedProducts) {
        processedIds.add(productId);
      }
    }
  });
}

async function main() {
  Rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () =>
    Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds))
  );

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    duplicates: 0
  });

  const input = await Actor.getInput();
  const {
    debug = false,
    proxyGroups = [],
    type = ActorType.Full,
    urls =  [{ url: "https://shop.billa.cz/", label: "start" }],
  } = input || {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 400,
    maxRequestRetries: 5,
    persistCookiesPerSession: true,
    proxyConfiguration,
    additionalMimeTypes: ["application/json"],
    requestHandler: defRouter({stats, processedIds}),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(urls);
  log.info("Crawler finished");

  await stats.save(true);

  const tableName = `billa_cz${type === ActorType.BlackFriday ? "_bf" : ""}`;
  await uploadToKeboola(tableName);

  log.info("Finished.");
}

await Actor.main(main);
