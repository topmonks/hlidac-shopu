import { BasicCrawler } from "@crawlee/basic";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum {string} */
const Labels = {
  Start: "START",
  Pagination: "PAGINATION",
  Page: "PAGE",
  PageBF: "PAGE_BF"
};

/** @enum {string} */
const StartUrls = {
  CZ: "https://nakup.itesco.cz/groceries/cs-CZ/",
  SK: "https://potravinydomov.itesco.sk/groceries/sk-SK/"
};

// Chrome header set required to bypass Akamai Bot Manager on nakup.itesco.cz.
// Keep the key order and values in sync with what a real Chrome on Linux sends
// for a top-level navigation — Akamai checks the full set, not just the UA.
const CHROME_HEADERS = Object.freeze({
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "cs-CZ,cs;q=0.9,en;q=0.8",
  "accept-encoding": "gzip, deflate, br, zstd",
  "sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not:A-Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1"
});

/**
 * Map of non-clubcard sale text parsers. Get the appropriate parser by country.
 * The new MFE state exposes promotion descriptions as e.g. "33%, předtím 29.90 Kč",
 * so the regex matches just the "předtím / predtým" part of the original contract.
 * @type {Record<Country, (offerText: string) => { originalPrice: number } | null>}
 */
const saleParsers = {
  [Country.CZ]: offerText => {
    const matched = /předtím\s+([\d,.]+)\s*Kč/.exec(offerText);
    if (!matched) return null;
    return { originalPrice: cleanPrice(matched[1]) };
  },
  [Country.SK]: offerText => {
    const matched = /predtým\s+([\d,.]+)\s*€/.exec(offerText);
    if (!matched) return null;
    return { originalPrice: cleanPrice(matched[1]) };
  }
};

/**
 * Fetch an HTML page with the Chrome header profile required by Akamai.
 * Throws on non-2xx or when the response body is an Akamai sensor challenge,
 * so the Crawlee retry loop kicks in.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchHtml(url) {
  const res = await fetch(url, { headers: CHROME_HEADERS, redirect: "follow" });
  const body = await res.text();
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  if (body.includes("sec-if-cpt-container")) {
    throw new Error(`Akamai bot challenge for ${url}`);
  }
  return body;
}

/**
 * Parse the MFE state blob embedded in every nakup.itesco.cz page as a
 * <script type="application/discover+json"> element.
 * @param {Document} document
 */
function parseDiscoverJson(document) {
  const script = document.querySelector('script[type="application/discover+json"]');
  if (!script) return null;
  try {
    return JSON.parse(script.textContent);
  } catch {
    return null;
  }
}

/**
 * Walk the data-plp-breadcrumb JSON tree and return the trail of text nodes
 * from root to the current:true leaf. Mirrors what the old `.breadcrumbs ol li`
 * DOM selector used to yield: a flat array of breadcrumb strings for the page.
 */
function breadcrumbTrail(nodes) {
  if (!Array.isArray(nodes)) return [];
  for (const node of nodes) {
    if (node?.current) {
      const deeper = breadcrumbTrail(node.children);
      return [node.text, ...deeper];
    }
    const deeper = breadcrumbTrail(node?.children);
    if (deeper.length) return [node.text, ...deeper];
  }
  return [];
}

/**
 * @param {Document} document
 * @returns {string[]}
 */
function extractCategoryBreadcrumb(document) {
  const el = document.querySelector("[data-plp-breadcrumb]");
  if (!el) return [];
  try {
    const data = JSON.parse(el.getAttribute("data-plp-breadcrumb"));
    return breadcrumbTrail(data).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Read the total product count for the current category page from the MFE
 * state. Used by the pagination handler to derive the page count (replacing
 * the old `.pagination--page-selector-wrapper ul li` DOM parsing).
 * @param {Document} document
 * @returns {{ total: number, pageSize: number } | null}
 */
function extractPageInfo(document) {
  const discover = parseDiscoverJson(document);
  const rootQuery = discover?.["mfe-orchestrator"]?.props?.apolloCache?.ROOT_QUERY ?? {};
  for (const [key, value] of Object.entries(rootQuery)) {
    if (key.startsWith("category(") && value?.info?.total != null) {
      return { total: value.info.total, pageSize: value.info.count || 24 };
    }
  }
  return null;
}

function extractItems({ document, country, uniqueItems, stats }) {
  const rootUrl = country === Country.CZ ? "https://nakup.itesco.cz" : "https://potravinydomov.itesco.sk";
  const locale = country === Country.CZ ? "cs-CZ" : "sk-SK";
  const category = extractCategoryBreadcrumb(document);

  const discover = parseDiscoverJson(document);
  const apolloCache = discover?.["mfe-orchestrator"]?.props?.apolloCache ?? {};

  // Resolve each ProductType.promotions ref to its description via the cache.
  const resolvePromo = ref => {
    if (!ref) return null;
    const key = ref.__ref ?? (typeof ref === "string" ? ref : null);
    if (!key) return null;
    return apolloCache[key] ?? null;
  };

  const results = [];
  for (const [key, product] of Object.entries(apolloCache)) {
    if (!key.startsWith("ProductType:")) continue;
    if (!product || typeof product !== "object") continue;

    const itemId = parseInt(product.id);
    if (!itemId || uniqueItems.has(itemId)) continue;

    const price = product.price ?? {};
    const result = {
      itemId,
      category,
      currency: country === Country.CZ ? "CZK" : "EUR",
      currentPrice: typeof price.actual === "number" ? price.actual : cleanPrice(price.actual),
      currentUnitPrice: typeof price.unitPrice === "number" ? price.unitPrice : cleanPrice(price.unitPrice),
      discounted: false,
      itemUrl: `${rootUrl}/groceries/${locale}/products/${product.id}`
    };

    // Find the first non-Clubcard promotion (matching the old `.offer-text`
    // filter) and parse its description for the original price.
    const offerText = (product.promotions ?? [])
      .map(resolvePromo)
      .map(promo => promo?.description)
      .find(desc => desc && !desc.includes("Clubcard"));

    if (offerText) {
      const saleData = saleParsers[country](offerText);
      if (saleData) {
        result.discounted = true;
        result.originalPrice = saleData.originalPrice;
      }

      // Weighable items were detected by DOM quantity controls in the old
      // actor. In the MFE state they are `displayType: "QuantityOrWeight"`
      // (or `productType: "LooseProduce"`).
      result.useUnitPrice = product.displayType === "QuantityOrWeight" || product.productType === "LooseProduce";
      if (result.useUnitPrice) {
        result.originalUnitPrice = result.originalPrice;
        result.unitOfMeasure = "0.1kg";
        result.currentPrice /= 10;
        if (typeof result.originalPrice === "number") {
          result.originalPrice /= 10;
        }
      }
    }

    result.itemName = product.title;
    result.img = product.defaultImageUrl;
    result.inStock = product.status === "AvailableForSale";

    if (!result.currentPrice && result.inStock) {
      log.error("Missing price", result);
    }

    uniqueItems.add(result.itemId);
    results.push(result);
  }

  // stats.offers previously accumulated `results.count` (per-page item count)
  // once per handler call. Match that semantic: add the number of items
  // emitted from this page.
  stats.add("offers", results.length);

  return results;
}

/**
 * Extract top-level category URLs from the groceries homepage. Replaces the
 * old `.menu__link--superdepartment` DOM class (removed in the ddsweb
 * migration) with an href regex matching `/groceries/<locale>/shop/<slug>/all`
 * filtered to top-level superdepartments (exactly one slug segment).
 * @param {Document} document
 * @param {Country} country
 */
function startUrls(document, country) {
  const rootUrl = country === Country.CZ ? "https://nakup.itesco.cz" : "https://potravinydomov.itesco.sk";
  const pattern = /^(?:https?:\/\/[^/]+)?(\/groceries\/[a-z]{2}-[A-Z]{2}\/shop\/[^/?#]+\/all)(?:[?#]|$)/;
  const seen = new Set();
  const hrefs = [];
  for (const a of document.querySelectorAll("a[href]")) {
    const href = (a.getAttribute("href") ?? "").trim();
    const m = pattern.exec(href);
    if (!m) continue;
    const url = `${rootUrl}${m[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    hrefs.push(url);
  }
  return hrefs;
}

/**
 * @param {string} url
 * @param {number|null} lastPage
 * @returns {string[]|undefined}
 */
function pagesUrls(url, lastPage) {
  const parsedLastPage = parseInt(lastPage);
  if (parsedLastPage > 1) {
    return restPageUrls(parsedLastPage, page => `${url}?page=${page}`);
  }
}

/**
 * @param {string} country
 * @param {ActorType} type
 */
function getTableName(country, type) {
  const tableName = country === Country.CZ ? "itesco" : "itesco_sk";
  if (type === ActorType.BlackFriday) {
    return `${tableName}_bf`;
  }
  return tableName;
}

async function startCrawler(crawler, { type, country, bfUrl, testUrl }) {
  let startingRequest;
  if (type === ActorType.BlackFriday) {
    startingRequest = {
      url: bfUrl,
      userData: { label: Labels.PageBF }
    };
  } else if (type === ActorType.Test) {
    startingRequest = {
      url: testUrl,
      userData: { label: Labels.Page }
    };
  } else {
    // Default (Full, Daily, and any other non-BF/non-Test value) — full catalog crawl.
    startingRequest = {
      url: country === Country.CZ ? StartUrls.CZ : StartUrls.SK,
      userData: { label: Labels.Start }
    };
  }
  await crawler.run([startingRequest]);
}

/**
 * @param {Document} document
 * @param {Country} country
 */
function extractBFItems(document, country) {
  return document.querySelectorAll(".a-productListing__productsGrid__element").map(el => {
    const itemUrl = el.querySelector("a.ghs-link")?.getAttribute("href");
    if (!itemUrl) {
      return;
    }
    const originalPrice =
      parseFloat(el.querySelector(".product__old-price")?.innerText.trim().replace(",", "").replace(/\s+/g, "")) / 100;
    const currentPrice = parseFloat(el.querySelector(".product__price ")?.innerText.trim().replace(/\s+/g, "")) / 100;
    log.info(`Found  ${itemUrl}`);
    return {
      itemId: itemSlug(itemUrl),
      itemUrl,
      itemName: el.querySelector(".product__name")?.innerText,
      img: `https://itesco.${country.toLowerCase()}${el.querySelector(".product__img-wrapper img")?.getAttribute("data-src")}`,
      originalPrice,
      currentPrice,
      discounted: originalPrice ? originalPrice > currentPrice : false,
      category: country.toLowerCase() === "cz" ? ["Speciální nabídky"] : ["Špeciálne ponuky"],
      currency: country.toLowerCase() === "cz" ? "CZK" : "EUR"
    };
  });
}

async function main() {
  Rollbar.init();

  const stats = await withPersistedStats({
    offers: 0,
    failed: 0
  });
  const uniqueItems = new Set();

  const {
    development,
    maxRequestRetries = 5,
    country = Country.CZ,
    type = ActorType.Full,
    // TODO: use urls = []; instead
    bfUrl = "https://itesco.cz/akcni-nabidky/seznam-produktu/black-friday/",
    testUrl = "https://nakup.itesco.cz/groceries/cs-CZ/shop/pekarna/all"
  } = await getInput();

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const crawler = new BasicCrawler({
    maxRequestRetries,
    maxRequestsPerMinute: 600,
    requestHandlerTimeoutSecs: 60,
    async requestHandler({ request, crawler, log }) {
      log.info(`Processing ${request.url}, ${request.userData.label}`);
      const html = await fetchHtml(request.url);
      const { document } = parseHTML(html);

      switch (request.userData.label) {
        case Labels.Start: {
          const urls = startUrls(document, country);
          log.debug(`Found ${urls.length} top-level categories on ${request.url}`);
          await crawler.addRequests(urls.map(url => ({ url, userData: { label: Labels.Page } })));
          break;
        }
        case Labels.Page: {
          const pageInfo = extractPageInfo(document);
          const lastPage = pageInfo ? Math.ceil(pageInfo.total / pageInfo.pageSize) : null;
          const paginationUrls = pagesUrls(request.url, lastPage);
          if (paginationUrls) {
            log.debug(`Found ${paginationUrls.length} pagination pages on ${request.url}`);
            await crawler.addRequests(paginationUrls.map(url => ({ url, userData: { label: Labels.Pagination } })));
          }
          const items = extractItems({ document, country, uniqueItems, stats });
          await Dataset.pushData(items);
          break;
        }
        case Labels.PageBF: {
          const lastPage = document.querySelector(".ddl_plp_pagination .page a:last-child")?.innerText?.trim();
          const paginationUrls = pagesUrls(request.url, lastPage);
          if (paginationUrls) {
            await crawler.addRequests(paginationUrls.map(url => ({ url, userData: { label: Labels.PageBF } })));
          }
          const items = extractBFItems(document, country);
          await Dataset.pushData(items);
          break;
        }
        case Labels.Pagination: {
          const items = extractItems({ document, country, uniqueItems, stats });
          log.debug(`Found ${items.length} items on ${request.url}`);
          await Dataset.pushData(items);
          break;
        }
      }
    },
    failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await startCrawler(crawler, { type, country, bfUrl, testUrl });
  await stats.save(true);

  await uploadToKeboola(getTableName(country, type));
  log.info("upload to Keboola finished");
}

await Actor.main(main);
