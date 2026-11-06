import { createHttpRouter, HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */

const BASE_URL = "https://exalted.com";
const SITEMAP_URL = `${BASE_URL}/__sitemap__/products.xml`;
const PROCESSED_IDS_KEY = "processedIds";

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

// exalted.com serves every market from one domain, locale is the first path segment
const locales = new Map([
  [Country.CZ, { lang: "cs", currency: "CZK" }],
  [Country.SK, { lang: "sk", currency: "EUR" }]
]);

// Nuxt serializes its payload with `devalue`. Arrays starting with these type
// names are wrappers around a single value (reactivity helpers etc.).
const DEVALUE_WRAPPERS = new Set([
  "Reactive",
  "ShallowReactive",
  "Ref",
  "ShallowRef",
  "EmptyRef",
  "EmptyShallowRef",
  "null"
]);

/**
 * Resolves `devalue` flattened payload (array of values referencing each other by index).
 * @param {any[]} payload
 * @returns {(index: number) => any}
 */
function devalueResolver(payload) {
  const cache = new Map();
  const resolve = index => {
    if (typeof index !== "number" || index < 0) return null; // negative = undefined/null/NaN/...
    if (cache.has(index)) return cache.get(index);
    const value = payload[index];
    if (Array.isArray(value)) {
      if (typeof value[0] === "string") {
        // special types – we only need plain data, unwrap simple wrappers, drop the rest
        const result = DEVALUE_WRAPPERS.has(value[0]) && value.length > 1 ? resolve(value[1]) : null;
        cache.set(index, result);
        return result;
      }
      const result = [];
      cache.set(index, result);
      for (const i of value) result.push(resolve(i));
      return result;
    }
    if (value && typeof value === "object") {
      const result = {};
      cache.set(index, result);
      for (const [k, i] of Object.entries(value)) result[k] = resolve(i);
      return result;
    }
    cache.set(index, value);
    return value;
  };
  return resolve;
}

/**
 * Finds product (Vendure Product with variants) in the Nuxt payload of a detail page.
 * @param {string} html
 * @param {string | undefined} productId ID from the URL, the payload may contain other (related) products
 * @returns {Object | null}
 */
function extractNuxtProduct(html, productId) {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1]);
    const resolve = devalueResolver(payload);
    const candidates = [];
    payload.forEach((x, i) => {
      if (x && typeof x === "object" && !Array.isArray(x) && "variants" in x && "priceBeforeDiscount" in x) {
        candidates.push(i);
      }
    });
    const products = candidates.map(resolve);
    return products.find(p => String(p?.id) === productId) ?? products[0] ?? null;
  } catch (e) {
    log.warning(`Unable to parse Nuxt payload: ${e.message}`);
    return null;
  }
}

/**
 * Locale is the first path segment (/cs/…, /sk/…).
 * @param {string} url
 * @returns {string | undefined} country code
 */
function countryFromUrl(url) {
  const lang = new URL(url).pathname.split("/")[1];
  return Array.from(locales).find(([, locale]) => locale.lang === lang)?.[0];
}

/**
 * @param {Document} document
 * @returns {Object | null} schema.org Product
 */
function extractLdProduct(document) {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      const product = [data].flat().find(x => x?.["@type"] === "Product");
      if (product) return product;
    } catch {}
  }
  return null;
}

/**
 * Vendure prices are integers in minor units (haléře / centy).
 * @param {number | null | undefined} price
 * @returns {number | null}
 */
const fromMinorUnits = price => (Number.isFinite(price) ? price / 100 : null);

/**
 * @param {Object} params
 * @param {string} params.url
 * @param {string} params.html
 * @param {string} params.country
 * @returns {Product | null}
 */
function extractProduct({ url, html, country: inputCountry }) {
  // URL wins over input, so manually passed /sk/ URLs get EUR even with country=CZ
  const country = countryFromUrl(url) ?? inputCountry;
  const { document } = parseHTML(html);
  const { currency } = locales.get(country);
  const urlId = new URL(url).pathname.match(/\/products\/(\d+)/)?.[1];
  const nuxtProduct = extractNuxtProduct(html, urlId);
  const ldProduct = extractLdProduct(document);

  const itemUrl = new URL(url).href;
  const itemId = nuxtProduct?.id ? String(nuxtProduct.id) : urlId;
  if (!itemId) return null;

  let currentPrice = null;
  let originalPrice = null;
  let inStock = false;

  const variants = (nuxtProduct?.variants ?? []).filter(v => Number.isFinite(v?.price));
  if (variants.length) {
    // the cheapest variant is the price shown on the product page ("od ...")
    const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a));
    currentPrice = fromMinorUnits(cheapest.price);
    const before = fromMinorUnits(cheapest.priceBeforeDiscount ?? nuxtProduct.priceBeforeDiscount);
    originalPrice = before && before > currentPrice ? before : null;
    inStock = variants.some(v => v.stockLevel && v.stockLevel !== "OUT_OF_STOCK");
  } else if (ldProduct) {
    // fallback – JSON-LD has current price only
    const offers = [ldProduct.offers ?? []].flat();
    const prices = offers.map(o => Number.parseFloat(o.price)).filter(Number.isFinite);
    currentPrice = prices.length ? Math.min(...prices) : null;
    inStock = offers.some(o => String(o.availability).endsWith("InStock"));
  }

  const itemName = (
    nuxtProduct?.name ??
    ldProduct?.name ??
    document.querySelector("meta[property='og:title']")?.getAttribute("content")
  )?.trim();
  const img =
    nuxtProduct?.featuredAsset?.preview ??
    [ldProduct?.image ?? []].flat()[0] ??
    document.querySelector("meta[property='og:image']")?.getAttribute("content");
  // product belongs to many collections; use the deepest breadcrumb path, but collections
  // are mostly flat (root > Ženy, root > Mikiny), so fall back to the first two (gender > type)
  const isReal = c => c?.slug && c.slug !== "__root_collection__";
  const collections = (nuxtProduct?.collections ?? []).filter(isReal);
  const deepest = collections
    .map(c => (c.breadcrumbs ?? []).filter(isReal))
    .reduce((a, b) => (b.length > a.length ? b : a), []);
  const category = (deepest.length > 1 ? deepest : collections.slice(0, 2)).map(c => c.name).join(" > ");

  return {
    // computed here instead of shopName()/itemSlug() so the actor does not depend
    // on a published @hlidac-shopu/lib release that already knows exalted.com
    shop: `exalted_${country.toLowerCase()}`,
    shopOrigin: `exalted.${country.toLowerCase()}`,
    slug: itemId,
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    originalPrice,
    discounted: Boolean(originalPrice),
    currency,
    category: category || undefined,
    inStock
  };
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    /**
     * Products sitemap lists every product once per locale.
     * @param {HttpCrawlingContext} ctx
     */
    async start({ request, body, crawler }) {
      const { userData } = request;
      const { lang } = locales.get(userData.country);
      const re = new RegExp(`<loc>(https://exalted\\.com/${lang}/products/[^<]+)</loc>`, "g");
      const urls = Array.from(new Set(Array.from(body.toString().matchAll(re), m => m[1].trim())));
      if (!urls.length) {
        throw new Error(`No product URLs for locale "${lang}" found in ${request.url}`);
      }
      const selected = userData.type === ActorType.Test ? urls.slice(0, 10) : urls;
      stats.add("urls", selected.length);
      log.info(`Found ${urls.length} products in sitemap, queueing ${selected.length}`);
      await crawler.addRequests(selected.map(url => ({ url, label: "detail", userData })));
    },
    /**
     * @param {HttpCrawlingContext} ctx
     */
    async detail({ request, body, log }) {
      const { url, userData } = request;
      const product = extractProduct({ url, html: body.toString(), country: userData.country });
      if (!product || product.currentPrice === null) {
        stats.inc("missingPrice");
        log.warning(`Price not found on ${url}`);
        return;
      }
      if (processedIds.has(product.itemId)) {
        stats.inc("duplicates");
        return;
      }
      processedIds.add(product.itemId);
      stats.inc("items");
      if (product.discounted) stats.inc("discounted");
      await Actor.pushData(product);
    }
  });
}

/**
 * @param {Object} params
 * @param {string} params.country
 * @param {ActorType} params.type
 * @param {string[]} params.urls product detail URLs to scrape instead of the whole sitemap
 * @returns {RequestOptions[]}
 */
function getStartUrls({ country, type, urls }) {
  if (urls?.length) {
    return urls.map(x => ({ url: x.url ?? x, label: "detail", userData: { country, type } }));
  }
  return [{ url: SITEMAP_URL, label: "start", userData: { country, type } }];
}

async function main() {
  Rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats({
    urls: 0,
    items: 0,
    discounted: 0,
    duplicates: 0,
    missingPrice: 0,
    failed: 0
  });

  const {
    debug,
    type = ActorType.Full,
    country: countryInput = Country.CZ,
    proxyGroups,
    urls,
    maxConcurrency = 5,
    maxRequestRetries
  } = await getInput();
  const country = countryInput.toUpperCase();
  if (!locales.has(country)) throw new Error(`Unsupported country "${countryInput}"`);

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries,
    maxRequestsPerMinute: 300,
    // products sitemap has ~17 MB (all locales)
    navigationTimeoutSecs: 120,
    proxyConfiguration,
    additionalMimeTypes: ["application/xml", "text/xml"],
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run(getStartUrls({ country, type, urls }));
  await stats.save(true);

  const tableName = `exalted_${country.toLowerCase()}${type === ActorType.BlackFriday ? "_bf" : ""}`;
  await uploadToKeboola(tableName);
}

await Actor.main(main, { statusMessage: "DONE" });
