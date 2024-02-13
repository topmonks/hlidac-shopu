import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, log, LogLevel } from "apify";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";

const PROCESSED_IDS_KEY = "processedIds";

function getName(result) {
  const name = result.querySelector("[data-micro=name]");
  name.querySelector(".category-appendix").remove();
  return name.textContent.trim();
}

function toProduct(result, category, url) {
  const itemId = result.dataset.microProductId;
  const itemUrl = new URL(result.querySelector("a").href, url).href;
  const itemName = getName(result);
  const img = result.querySelector("img").dataset.microImage;
  const offer = result.querySelector("[data-micro=offer]");
  const currency = offer.dataset.microPriceCurrence;
  const inStock =
    offer.dataset.microAvailability === "https://schema.org/InStock";
  const currentPrice = cleanPrice(offer.dataset.microPrice);
  const originalPrice = cleanPrice(
    offer.querySelector(".product-item-price>strong, .prices>span")?.textContent
  );
  const discounted = Boolean(originalPrice) && currentPrice !== originalPrice;
  return {
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    originalPrice,
    currency,
    discounted,
    category,
    inStock
  };
}

function getCategory(breadcrumbs) {
  const items = Array.from(
    breadcrumbs.querySelectorAll("[itemprop=itemListElement] [itemprop=name]")
  ).map(el => el.textContent);
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

      const paginationLinks = Array.from(
        document.querySelectorAll(".pagination a")
        ).map(a => new URL(a.href, request.url).href);
      if (paginationLinks.length){
        await enqueueLinks({
          urls: paginationLinks,
          label: "category",
          userData: { pagination: true }
        });
      }

      const category = getCategory(
        document.querySelector(
          ".container>[itemtype='https://schema.org/BreadcrumbList']"
        )
      );
      const products = document.querySelectorAll(
        "#products [data-micro=product]"
      );
      for (const item of products) {
        if (processedIds.has(item.dataset.microProductId)) {
          stats.inc("duplicates");
          continue;
        }
        await Actor.pushData(toProduct(item, category, request.url));
        processedIds.add(item.dataset.microProductId);
        stats.inc("products");
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
