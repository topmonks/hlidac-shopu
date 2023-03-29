import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { currencyToISO4217 } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";
import { Actor, Dataset, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { URL, URLSearchParams } from "url";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

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
  START: "START",
  CATEGORY: "CATEGORY"
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

function makeListingUrl(
  countryCode,
  productQuery,
  currentPage,
  pageSize = 100
) {
  return `https://product-search.services.dmtech.com/${countryCode.toLowerCase()}/search/static?${new URLSearchParams(
    {
      ...productQuery,
      pageSize,
      currentPage,
      sort: "price_asc",
      type: "search-static"
    }
  )}`;
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
    if (category.children) {
      yield* traverseCategories(category.children, [...names, category.title]);
    } else {
      names = [...names, category.title];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
  }
}

function parseItem(p, country, category) {
  return {
    itemId: p.gtin,
    itemName: `${p.brandName} ${p.name}`,
    itemUrl: createProductUrl(country, p.relativeProductUrl),
    img: p.imageUrlTemplates[0]?.replace(
      "{transformations}",
      "f_auto,q_auto,c_fit,w_260,h_270"
    ),
    inStock: p.purchasable,
    currentPrice: p.price.value,
    originalPrice: p.isSellout
      ? parseFloat(
          p.selloutPrice.formattedValue
            .trim()
            .replace(/[^\d,]+/g, "")
            .replace(",", ".")
        )
      : null,
    currency: currencyToISO4217(p.price.currencySymbol),
    category,
    discounted: p.isSellout
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
  stats.add("items", products.length);
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
    log.debug(
      `Found ${products.length} products (${uniqueCount} unique) at ${request.url}`
    );
  }
}

async function saveProducts({
  products,
  stats,
  processedIds,
  detailUrl,
  country,
  category
}) {
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
  return responses.length / 2;
}

function categoryRequest(json, country, category) {
  const { mainData } = json;
  const result = mainData
    .map(x => x.query?.query)
    .filter(Boolean)
    .shift();
  if (!result) return;

  let tempProductQuery = {};
  const resultValue = result.split(":")[3];
  if (result.includes(":allCategories") && resultValue) {
    tempProductQuery = { "allCategories.id": resultValue };
  } else if (result.includes(":brand") && resultValue) {
    const brand = resultValue.split("|")[0];
    tempProductQuery = { "brandName": brand };
  }
  return {
    url: makeListingUrl(country, tempProductQuery, 0),
    userData: {
      country,
      category,
      productQuery: tempProductQuery
    }
  };
}

function startRequests(type, navigation, stats, country) {
  log.info(`Pagination info ${type}`);
  const requests = [];
  const { children } = navigation;
  // we are traversing recursively from leaves to trunk
  for (const category of traverseCategories(children)) {
    log.debug(`Found category ${category.title} at link: ${category.link}`);
    stats.inc("categories");
    // we need to await here to prevent higher categories
    // to be enqueued sooner than sub-categories
    requests.push({
      url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
        country
      )}${category.link}/?json`,
      userData: {
        country,
        category: category.breadcrumbs.toString(),
        label: Lables.CATEGORY
      }
    });
  }
  return requests;
}

function startingRequests(type, country) {
  const requests = [];
  if (type === ActorType.Full) {
    requests.push({
      url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
        country
      )}/?view=navigation&json`,
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

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
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
    maxRequestsPerMinute: 400,
    async requestHandler({ request, json, crawler }) {
      log.info(`Processing ${request.url}...`);
      const {
        userData: { country, label, category, productQuery }
      } = request;

      if (!json) return;
      const { type, navigation } = json;
      switch (label) {
        case Lables.START:
          {
            const requests = startRequests(type, navigation, stats, country);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Lables.CATEGORY:
          {
            const request = categoryRequest(json, country, category);
            if (!request) return;
            await crawler.requestQueue.addRequest(request);
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
  log.info("crawler finished");

  if (Actor.isAtHome()) {
    log.info("uploading data to Keboola");
    uploadToKeboola(shopName(detailUrl.deref()));
  }

  log.info("invalidated Data CDN");
}

await Actor.main(main, { statusMessage: "DONE" });
