import { BasicCrawler, useState } from "@crawlee/basic";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts, shopName, shopOrigin } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, log } from "apify";
import { Impit } from "impit";

const shopUrl = "https://www.tsbohemia.cz";
const sitemapIndexUrl = `${shopUrl}/sitemap.xml`;

/** @enum {string} */
const Labels = {
  SitemapIndex: "SITEMAP_INDEX",
  CategorySitemap: "CATEGORY_SITEMAP",
  ProductSitemap: "PRODUCT_SITEMAP",
  Category: "CATEGORY",
  CategoryPage: "CATEGORY_PAGE"
};

// The shop is behind a Cloudflare managed challenge that scores the TLS
// handshake, so impit's Chrome ClientHello is required where got-scraping gets
// a 403. No browser, solver or proxy needed — see README.md.

/** @param {string} html */
function parseNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** @param {string} html */
function parseJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // A malformed block must not take the whole page down.
    }
  }
  return out;
}

// Sitemaps run to ~300 kB of XML; a regex is markedly cheaper than a DOM parse
// and `<loc>` never matches the namespaced `<image:loc>` nodes.
const sitemapLocs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());

/**
 * Prices come from JSON-LD, never from `__NEXT_DATA__.pricesFor[]` — that node's
 * `originalPrice` is always 0 and its `priceVat` is the regular, not the selling
 * price. `RegularPrice` is emitted only when the product is discounted.
 *
 * @param {object} element JSON-LD ListItem
 * @param {string} category breadcrumb path
 */
function toProduct(element, category) {
  const item = element?.item;
  const itemId = item?.url?.match(/_d(\d+)(?:\.html)?$/)?.[1];
  if (!itemId) return null;

  const specs = item.offers?.priceSpecification ?? [];
  const priceOf = type => specs.find(s => s.priceType?.endsWith(type))?.price ?? null;
  const regularPrice = priceOf("RegularPrice");
  const salePrice = priceOf("SalePrice");
  const currentPrice = salePrice ?? regularPrice;
  const discounted = Boolean(regularPrice && currentPrice && currentPrice < regularPrice);

  return {
    shop: shopName(item.url),
    shopOrigin: shopOrigin(item.url),
    slug: itemId,
    itemId,
    itemUrl: item.url,
    itemName: item.name,
    img: item.image ?? null,
    currentPrice,
    originalPrice: discounted ? regularPrice : null,
    discounted,
    currency: "CZK",
    inStock: item.offers?.availability === "https://schema.org/InStock",
    category
  };
}

/** Breadcrumb path of the current category page, e.g. "Elektronika > Televize". */
function categoryPath(nextData) {
  const crumbs = nextData?.props?.pageProps?.breadcrumb ?? [];
  return crumbs
    .map(c => c.name)
    .filter(Boolean)
    .join(" > ");
}

function startingRequest(type) {
  switch (type) {
    case ActorType.Full:
      return { url: sitemapIndexUrl, userData: { label: Labels.SitemapIndex } };
    case ActorType.Count:
      return { url: sitemapIndexUrl, userData: { label: Labels.SitemapIndex, countOnly: true } };
    case ActorType.BlackFriday:
      return { url: `${shopUrl}/-black-friday_c41438`, userData: { label: Labels.Category } };
    case ActorType.Test:
      return { url: `${shopUrl}/televize_c5622`, userData: { label: Labels.Category } };
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

async function main() {
  rollbar.init();

  const {
    development,
    debug,
    maxRequestRetries = 3,
    maxConcurrency = 4, // the shop answers 429 well above this
    maxRequestsPerMinute = 120,
    type = ActorType.Full
  } = await getInput();

  if (debug) log.setLevel(log.LEVELS.DEBUG);

  const stats = await withPersistedStats({
    categories: 0,
    categoriesDone: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    itemsChanged: 0,
    expectedProducts: 0,
    throttled: 0,
    blocked: 0,
    failed: 0
  });

  const processedIds = await useState("processedIds", {});
  const impit = new Impit({ browser: "chrome" });

  async function fetchPage(url) {
    const res = await impit.fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
        "Upgrade-Insecure-Requests": "1"
      }
    });
    return { status: res.status, body: await res.text() };
  }

  const crawler = new BasicCrawler({
    maxRequestRetries,
    maxConcurrency,
    maxRequestsPerMinute,
    // The 429 backoff below sleeps inside the handler, so the default 60 s
    // budget would kill the last retry as a timeout instead of letting it run.
    requestHandlerTimeoutSecs: 120,
    async requestHandler({ request, log, crawler }) {
      const { label, countOnly, category } = request.userData;
      const { status, body } = await fetchPage(request.url);

      // Rate limited. Crawlee's own retry backoff is too eager here, so hold
      // this worker before handing the request back to the queue — that both
      // delays the retry and takes one worker out of rotation meanwhile.
      // Capped so the sleep stays well inside requestHandlerTimeoutSecs.
      if (status === 429) {
        stats.inc("throttled");
        const backoffMs = Math.min(10_000 * (request.retryCount + 1), 30_000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        throw new Error(`Rate limited (429) on ${request.url}`);
      }

      // The challenge stub is a ~6 kB HTML page; a real listing is ~1 MB.
      if (status === 403 || body.includes("<title>Just a moment...</title>")) {
        stats.inc("blocked");
        throw new Error(`Blocked by Cloudflare on ${request.url} (status=${status})`);
      }
      if (status !== 200) throw new Error(`Unexpected status ${status} on ${request.url}`);

      switch (label) {
        case Labels.SitemapIndex: {
          const locs = sitemapLocs(body);
          // Active products only. `sitemap-products-disabled-*` lists ~430k
          // delisted SKUs and `-accessories/-reviews/-consultations` are
          // secondary pages, not products.
          const isProductSitemap = u => /\/sitemap-products-\d+-cs\.xml$/.test(u);
          const isCategorySitemap = u => /\/sitemap-categories-\d+-cs\.xml$/.test(u);

          if (countOnly) {
            const sitemaps = locs.filter(isProductSitemap);
            log.info(`COUNT: ${sitemaps.length} product sitemaps`);
            await crawler.addRequests(sitemaps.map(url => ({ url, userData: { label: Labels.ProductSitemap } })));
            break;
          }

          const sitemaps = locs.filter(isCategorySitemap);
          if (!sitemaps.length) {
            throw new Error("No category sitemaps found in the sitemap index - structure changed");
          }
          log.info(`Found ${sitemaps.length} category sitemaps`);
          await crawler.addRequests(sitemaps.map(url => ({ url, userData: { label: Labels.CategorySitemap } })));
          break;
        }

        case Labels.ProductSitemap: {
          const count = sitemapLocs(body).length;
          stats.add("expectedProducts", count);
          break;
        }

        case Labels.CategorySitemap: {
          const urls = sitemapLocs(body).filter(u => /_c\d+$/.test(u));
          stats.add("categories", urls.length);
          log.info(`Enqueuing ${urls.length} categories from ${request.url}`);
          await crawler.addRequests(urls.map(url => ({ url, userData: { label: Labels.Category } })));
          break;
        }

        case Labels.Category:
        case Labels.CategoryPage: {
          const nextData = parseNextData(body);
          if (!nextData) throw new Error(`No __NEXT_DATA__ on ${request.url} - layout changed`);

          const thumbs = nextData.props?.pageProps?.category?.productThumbs?.products;
          const path = category ?? categoryPath(nextData);

          const itemList = parseJsonLd(body).find(x => x["@type"] === "ItemList");
          const elements = itemList?.itemListElement ?? [];

          const products = elements.map(element => toProduct(element, path)).filter(Boolean);
          stats.add("items", await saveUniqProducts({ products, stats, processedIds }));
          stats.inc("pages");

          if (label === Labels.CategoryPage) break;

          // Every category is paginated, parents included. `categoryDetail.children`
          // is not a partition — it mixes filter facets with real sibling
          // categories, so skipping parents is unsafe either way. See README.md.
          stats.inc("categoriesDone");
          const pageCount = thumbs?.pageCount ?? 0;
          if (pageCount > 1) {
            await crawler.addRequests(
              restPageUrls(pageCount, pageNr => ({
                url: `${request.url}?page=${pageNr}`,
                userData: { label: Labels.CategoryPage, category: path }
              }))
            );
          }
          break;
        }

        default:
          throw new Error(`Unknown label: ${label}`);
      }
    },
    async failedRequestHandler({ request, log }) {
      log.error(`Request ${request.url} failed multiple times`);
      stats.inc("failed");
    }
  });

  log.info(`ACTOR - Start (type=${type})`);
  await crawler.run([startingRequest(type)]);
  log.info("ACTOR - End crawler");

  await stats.save(true);

  if (!development) {
    await uploadToKeboola(type === ActorType.BlackFriday ? "tsbohemia_bf" : "tsbohemia");
  }

  log.info("ACTOR - Finished");
}

await Actor.main(main);
