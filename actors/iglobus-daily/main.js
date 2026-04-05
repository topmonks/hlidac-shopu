import { HttpCrawler, useState } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, LogLevel, log } from "apify";

// iGlobus rebranded to globusonline.cz in early 2026. Every shop.iglobus.cz
// URL now 301-redirects to globusonline.cz, and the old /store/switch endpoint
// returns 404 on the new site. The new site is a Next.js React app that
// exposes all category and product data via a urqlState GraphQL cache embedded
// in <script id="__NEXT_DATA__">, so scraping is JSON parsing, not DOM.
const rootUrl = "https://globusonline.cz";
const CATEGORY_PAGE_SIZE = 60; // edges per page in the ProductConnection response

/** @enum {string} */
const Labels = {
  START: "START",
  LIST: "LIST",
  COUNT: "COUNT"
};

/**
 * Extract and JSON-parse the Next.js SSR data blob. Every page on
 * globusonline.cz embeds one; returns null if the tag is missing (e.g.
 * if the actor was pointed at an error page).
 * @param {string} html
 */
function parseNextData(html) {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Walk the urqlState cache and find a query result whose parsed data has a
 * given top-level key. Each cache entry has a stringified `data` field.
 * @returns {object|null}
 */
function findUrqlQuery(nextData, topKey) {
  const urql = nextData?.props?.pageProps?.urqlState;
  if (!urql) return null;
  for (const entry of Object.values(urql)) {
    if (!entry?.data) continue;
    try {
      const parsed = typeof entry.data === "string" ? JSON.parse(entry.data) : entry.data;
      if (parsed && parsed[topKey] != null) return parsed;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Extract top-level category URLs from the homepage. Reads the `categories`
 * query out of the Next.js urqlState — every entry is a category object with
 * a `slug` field that's already a relative path like "/k/pekarna-a-cukrarna".
 * @param {string} html
 * @returns {string[]} absolute category URLs
 */
function topCategoryUrls(html) {
  const data = parseNextData(html);
  const q = findUrqlQuery(data, "categories");
  if (!q?.categories) {
    // Fallback: regex over the raw HTML for /k/<slug> hrefs on the homepage.
    // Used if Next.js ever ships the page without the categories query
    // (e.g. a CMS-driven variant) so the actor keeps working.
    const seen = new Set();
    for (const m of html.matchAll(/href="(\/k\/[a-z0-9-]+)"/g)) {
      seen.add(m[1]);
    }
    return [...seen].map(p => `${rootUrl}${p}`);
  }
  return q.categories.map(c => `${rootUrl}${c.slug}`);
}

/**
 * Parse a price string like "3.900000" or "3900.00" into a plain number.
 * globusonline.cz stores prices as strings with six decimal places.
 */
function parsePrice(s) {
  if (s == null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract the products on a category page from the urqlState cache. Returns
 * an array of product objects in the same output shape the old DOM-based
 * extractItems() produced.
 * @param {string} html
 * @param {string} categoryName human-readable category label for the row
 */
function extractItems(html, categoryName) {
  const data = parseNextData(html);
  const q = findUrqlQuery(data, "products");
  const edges = q?.products?.edges;
  if (!Array.isArray(edges)) return [];

  return edges
    .map(edge => {
      const p = edge.node;
      if (!p || p.isSellingDenied) return null;
      const price = p.price ?? {};
      const currentPrice = parsePrice(price.priceWithVat);
      if (currentPrice == null) return null;

      const originalPrice = parsePrice(price.globusOriginalPrice);
      const baseComparison = parsePrice(price.baseComparisonPrice);

      return {
        itemId: p.id != null ? String(p.id) : p.uuid,
        itemName: p.fullName ?? p.name,
        itemUrl: `${rootUrl}${p.slug}`,
        img: p.mainImage?.url ?? null,
        currentPrice,
        originalPrice: originalPrice && originalPrice > currentPrice ? originalPrice : null,
        currentUnitPrice: baseComparison,
        useUnitPrice: p.productArticleType === "WEIGHT_PRODUCT",
        discounted: originalPrice != null && originalPrice > currentPrice,
        currency: "CZK",
        category: categoryName,
        inStock: p.availability?.status === "InStock"
      };
    })
    .filter(Boolean);
}

/**
 * Read the total product count for the current category page from the same
 * urqlState `category` query that carries taxonomy metadata. Used to compute
 * the pagination fan-out.
 * @param {string} html
 */
function extractCategoryTotal(html) {
  const data = parseNextData(html);
  // The `category` query is a separate urql entry from `products`, but both
  // live in the same urqlState map.
  const urql = data?.props?.pageProps?.urqlState;
  if (!urql) return { total: 0, name: "" };
  for (const entry of Object.values(urql)) {
    if (!entry?.data) continue;
    try {
      const parsed = typeof entry.data === "string" ? JSON.parse(entry.data) : entry.data;
      if (parsed?.category?.products?.totalCount != null) {
        return {
          total: parsed.category.products.totalCount,
          name: parsed.category.name ?? ""
        };
      }
    } catch {
      /* skip */
    }
  }
  return { total: 0, name: "" };
}

async function main() {
  rollbar.init();
  const { development, maxRequestRetries, proxyGroups, type = ActorType.Full } = await getInput();

  const processedIds = await useState("processedIds", {});
  const stats = await withPersistedStats({
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    countItems: 0
  });

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 600,
    async requestHandler({ crawler, request, body }) {
      const html = body.toString();
      const { url, userData } = request;
      const { label, category } = userData;
      log.info("Page opened.", { label, category, url });

      switch (label) {
        case Labels.START: {
          const categoryUrls = topCategoryUrls(html);
          log.info(`Found ${categoryUrls.length}x categories`);
          if (type === ActorType.Count) {
            const requests = categoryUrls.map(u => ({
              url: u,
              userData: { label: Labels.COUNT, category: u.substring(u.lastIndexOf("/") + 1) }
            }));
            await crawler.requestQueue.addRequests(requests);
          } else {
            const requests = categoryUrls.map(u => ({
              url: u,
              userData: { label: Labels.LIST, page: 1, category: u.substring(u.lastIndexOf("/") + 1) }
            }));
            stats.add("categories", requests.length);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        }

        case Labels.LIST: {
          stats.inc("pages");
          if (userData.page === 1) {
            const { total, name } = extractCategoryTotal(html);
            if (name) userData.category = name;
            const pagesTotal = Math.ceil(total / CATEGORY_PAGE_SIZE);
            if (pagesTotal > 1) {
              const requests = restPageUrls(pagesTotal, i => ({
                url: `${url}?page=${i}`,
                userData: { label: Labels.LIST, page: i, category: userData.category }
              }));
              await crawler.requestQueue.addRequests(requests, { forefront: true });
            }
          }
          const products = extractItems(html, userData.category);
          log.info(`Found ${products.length} products`);
          await saveUniqProducts({ products, stats, processedIds });
          break;
        }

        case Labels.COUNT: {
          const { total } = extractCategoryTotal(html);
          stats.add("countItems", total);
          log.info(`Found ${total} items in category ${userData.category}`);
          break;
        }

        default:
          log.error(`Unknown label ${label}`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  if (type === ActorType.Full || type === ActorType.Count) {
    startingRequests.push({
      url: `${rootUrl}/`,
      userData: { label: Labels.START }
    });
  } else if (type === ActorType.Test) {
    startingRequests.push({
      url: `${rootUrl}/k/pekarna-a-cukrarna`,
      userData: { label: Labels.LIST, page: 1, category: "Pekárna a cukrárna" }
    });
  }

  log.info("Starting the crawl.");
  await crawler.run(startingRequests);
  log.info("Crawl finished.");
  stats.save(true);
  log.debug("STATS saved!");

  if (!development) {
    await uploadToKeboola("globus_cz");
    log.info("upload to Keboola finished");
  }
  log.info("Finished.");
}

await Actor.main(main);
