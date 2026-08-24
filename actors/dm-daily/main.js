import { URL, URLSearchParams } from "node:url";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  DE: "DE",
  AT: "AT"
};

/** @enum {string} */
const Lables = {
  START: "START"
};

/**
 * @param {Country} country
 */
function getCountrySlug(country) {
  switch (country.toUpperCase()) {
    case Country.CZ:
      return "cs-cz";
    case Country.SK:
      return "sk-sk";
    case Country.HU:
      return "hu-hu";
    case Country.DE:
      return "de-de";
    case Country.AT:
      return "de-at";
  }
}

function makeListingUrl(countryCode, productQuery, currentPage, pageSize = 100) {
  return `https://product-search.services.dmtech.com/${countryCode.toLowerCase()}/search/crawl?${new URLSearchParams({
    ...productQuery,
    pageSize,
    currentPage,
    sort: "price_asc",
    type: "search-static"
  })}`;
}

/**
 * @param {Country} country
 * @param {string} url
 */
function createProductUrl(country, url) {
  return country.toUpperCase() === Country.SK
    ? new URL(url, "https://mojadm.sk").href
    : new URL(url, `https://dm.${country.toLowerCase()}`).href;
}

function* traverseCategories(categories, names = []) {
  for (const category of categories) {
    if (category.hidden || category.externalLink) continue;
    if (category.children) {
      yield* traverseCategories(category.children, [...names, category.title]);
    } else {
      names = [...names, category.title];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
  }
}

/*
  See item.json for a sample response from the API for an item
*/
function parseItem(item, country, category) {
  const p = item.tileData;

  const currentPrice = parseFloat(p.price.price.current.value
                        .trim()
                        .replace(/[^\d,]+/g, "")
                        .replace(",", "."));
  const originalPrice = p.price.price.previous ?
                        parseFloat(p.price.price.previous.value
                          .trim()
                          .replace(/[^\d,]+/g, "")
                          .replace(",", ".")) :
                        null

  // inStock information was moved to a different API call:
  // https://products.dm.de/availability/api/v1/tiles/CZ/<id>
  // Not necessary to make the extra call. But the Keboola table schema
  // requires it, so we include it (set to null)
  return {
    itemId: p.gtin,
    slug: p.gtin,
    itemName: [p.title.preheadline ?? item.brandName, p.title.tileHeadline].filter(Boolean).join(" "),
    itemUrl: createProductUrl(country, p.self),
    img: p.images[0]?.tileSrc ?? null,
    inStock: null,
    currentPrice,
    originalPrice,
    currency: p.trackingData.currency,
    category,
    discounted: originalPrice ? currentPrice !== originalPrice : false,
  };
}

async function handleProducts(
  json,
  stats,
  requestQueue,
  country,
  productQuery,
  category,
  processedIds,
  request,
  detailUrl
) {
  const { products, currentPage, totalPages } = json;
  if (products.length > 0) {
    if (currentPage === 0 && totalPages > 1) {
      for (let i = 1; i < totalPages; i++) {
        // we need to await here to prevent higher categories
        // to be enqueued sooner than sub-categories
        await requestQueue.addRequest(
          {
            url: makeListingUrl(country, productQuery, i),
            userData: {
              country,
              category
            }
          },
          { forefront: true }
        );
      }
    }
    const uniqueCount = await saveProducts({
      products,
      stats,
      processedIds,
      detailUrl,
      country,
      category
    });
    log.debug(`Found ${products.length} products (${uniqueCount} unique) at ${request.url}`);
  }
}

async function saveProducts({ products, stats, processedIds, detailUrl, country, category }) {
  const requests = [];
  for (const product of products) {
    if (!processedIds.has(product.gtin)) {
      processedIds.add(product.gtin);
      const detail = parseItem(product, country, category);
      if (!detailUrl.deref()) detailUrl.reset(detail.itemUrl);
      requests.push(Dataset.pushData(detail));
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  const responses = await Promise.all(requests);
  return responses.length;
}

/**
 * Navigation links have the form
 * `dmLink://searchresult/filters=allCategories.id:010101 isPharmacy:false`,
 * sometimes preceded by other params (`queryTerms=…&filters=…`), which the
 * search endpoint ignores. Values may be quoted and repeated keys are joined
 * by `OR`; the API accepts only one value per key, so alternatives become
 * separate queries.
 *
 * @param {string} link
 * @returns {Object[]} product queries
 */
function productQueries(link) {
  if (!link.startsWith("dmLink://searchresult/")) return [];
  const filters = link.match(/(?:^|[?&/])filters=(.*)$/)?.[1];
  if (!filters) return [];

  const groups = new Map();
  for (const token of filters.match(/[\w.]+:(?:"[^"]*"|\S+)/g) ?? []) {
    const i = token.indexOf(":");
    const key = token.slice(0, i);
    const value = token.slice(i + 1).replace(/^"|"$/g, "");
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(value);
  }
  if (!groups.size) return [];

  let queries = [{}];
  for (const [key, values] of groups) {
    queries = queries.flatMap(query => [...values].map(value => ({ ...query, [key]: value })));
  }
  return queries;
}

function categoriesListing({ type, navigation }, stats, country) {
  log.info(`Pagination info ${type}`);
  const requests = [];
  const { children } = navigation;
  for (const category of traverseCategories(children)) {
    log.debug(`Found category ${category.title} at link: ${category.link}`);
    for (const productQuery of productQueries(category.link)) {
      stats.inc("categories");
      requests.push({
        url: makeListingUrl(country, productQuery, 0),
        userData: {
          country,
          category: category.breadcrumbs.toString(),
          productQuery
        }
      });
    }
  }
  return requests;
}

function startingRequests(type, country) {
  const requests = [];
  if (type === ActorType.Full) {
    requests.push({
      url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(country)}/?view=navigation`,
      userData: {
        country,
        productQuery: "",
        label: Lables.START
      }
    });
  } else if (type === ActorType.Test) {
    const productQuery = { "brandName": "SEINZ." };
    requests.push({
      url: makeListingUrl(country, productQuery, 0),
      userData: {
        country,
        category: "test > test",
        categoryId: "020800"
      }
    });
  }
  return requests;
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats({
    categories: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });
  const processedIds = new Set();
  const detailUrl = defAtom(null);

  const {
    debug,
    country = Country.CZ,
    type = ActorType.Full,
    development = false,
    maxConcurrency = 2, // they rate limit us with 429s
    proxyGroups = ["CZECH_LUMINATI"]
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxConcurrency,
    // the search API rate limits a single IP after a couple of requests,
    // so every request gets a fresh session, and with it a fresh proxy IP
    retryOnBlocked: true,
    maxRequestRetries: 20,
    sessionPoolOptions: {
      sessionOptions: { maxUsageCount: 1 }
    },
    async requestHandler({ request, json, crawler }) {
      log.info(`Processing ${request.url}...`);
      const {
        userData: { country, label, category, productQuery }
      } = request;

      if (!json) return;
      switch (label) {
        case Lables.START:
          {
            const requests = categoriesListing(json, stats, country);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        default:
          return await handleProducts(
            json,
            stats,
            crawler.requestQueue,
            country,
            productQuery,
            category,
            processedIds,
            request,
            detailUrl
          );
      }
    },
    failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const requests = startingRequests(type, country);
  await crawler.run(requests);

  if (Actor.isAtHome()) {
    log.info("uploading data to Keboola");
    await uploadToKeboola(shopName(detailUrl.deref()));
  }
}

await Actor.main(main, { statusMessage: "DONE" });
