import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, LogLevel, log } from "apify";

const PROCESSED_IDS_KEY = "processedIds";

function getName(result) {
  const name = result.querySelector("[data-micro=name]");
  name.querySelector(".category-appendix").remove();
  return name.textContent.trim();
}

function toProduct(result, { category, url }) {
  const itemId = result.dataset.microProductId;
  const href = result.querySelector("a").href;
  const slug = href.split("/")[1];
  const itemUrl = new URL(href, url).href;
  const itemName = getName(result);
  const img = result.querySelector("img").dataset.microImage;
  const offer = result.querySelector("[data-micro=offer]");
  const currency = offer.dataset.microPriceCurrence;
  const inStock = offer.dataset.microAvailability === "https://schema.org/InStock";
  const currentPrice = cleanPrice(offer.dataset.microPrice);
  return {
    slug,
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    currency,
    breadCrumbs: category,
    inStock
  };
}

function getCategory(breadcrumbs) {
  const items = Array.from(breadcrumbs.querySelectorAll("[itemprop=itemListElement] [itemprop=name]")).map(
    el => el.textContent
  );
  items.shift();
  return items.join(" > ");
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    async start({ request, body, enqueueLinks }) {
      const { document } = parseHTML(body.toString("utf8"));
      const nav = document.getElementById("navigation");
      // Traverse categories from leafs to root so we catch most specific category first
      // because more broad categories contains all subcategories items
      const links = Array.from(
        new Set(
          [
            ...nav.querySelectorAll(".menu-level-3>li>a"),
            ...nav.querySelectorAll(".menu-level-2>li>a"),
            ...nav.querySelectorAll(".menu-level-1>li>a")
          ].map(a => new URL(a.href, request.url).href)
        )
      );
      await enqueueLinks({ urls: links, label: "category" });
    },
    async category({ request, body, crawler, enqueueLinks }) {
      const { pagination } = request.userData;
      if (!pagination) stats.inc("categories");
      const { document } = parseHTML(body.toString("utf8"));

      const paginationLinks = Array.from(document.querySelectorAll(".pagination a")).map(
        a => new URL(a.href, request.url).href
      );
      if (paginationLinks.length) {
        await enqueueLinks({
          urls: paginationLinks,
          label: "category",
          userData: { pagination: true }
        });
      }

      const category = getCategory(document.querySelector(".container>[itemtype='https://schema.org/BreadcrumbList']"));
      const products = Array.from(document.querySelectorAll("#products [data-micro=product]"));

      const shoptetGuids = products.map(x => x.dataset.microIdentifier).join(",");

      const productsById = products.map(item => [
        item.dataset.microIdentifier,
        toProduct(item, {
          category,
          url: request.url
        })
      ]);

      await crawler.requestQueue.addRequest({
        method: "POST",
        url: "https://penny-datamgr-prod.mirandamedia.cz/api/shoptet/product/action",
        headers: {
          "Accept": "application/json", // they ignore it, but let's be future proof
          "Content-Type": "application/x-www-form-urlencoded"
        },
        payload: new URLSearchParams({ shoptetGuids }).toString(),
        label: "products",
        userData: { productsById },
        useExtendedUniqueKey: true
      });
    },
    async products({ request, json, body }) {
      const { productsById } = request.userData;
      const originalPrices = new Map(
        // diletants at miranda media sends JSON as text/html, but meybe they will fix it sometimes in the future
        Object.entries(json ?? JSON.parse(body)).map(([key, value]) => [key, cleanPrice(value)])
      );
      for (const [productId, item] of productsById) {
        if (processedIds.has(productId)) {
          stats.inc("duplicates");
          continue;
        }
        await Actor.pushData(
          Object.assign(item, {
            originalPrice: originalPrices.get(productId),
            get discounted() {
              return Boolean(this.originalPrice) && this.currentPrice !== this.originalPrice;
            }
          })
        );
        processedIds.add(productId);
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
  const {
    debug = false,
    proxyGroups = [],
    type = ActorType.Full,
    urls = [{ url: "https://www.pennydomu.cz/", label: "start" }]
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
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(urls);
  log.info("Crawler finished");

  await stats.save(true);

  const suffix = type === ActorType.BlackFriday ? "_bf" : "";
  const tableName = `penny_cz${suffix}`;
  await uploadToKeboola(tableName);

  log.info("Finished.");
}

await Actor.main(main);
