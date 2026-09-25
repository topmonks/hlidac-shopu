import { HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

const currencyByCountry = new Map([
  ["CZ", "CZK"],
  ["SK", "EUR"]
]);

/**
 * @param {string} country
 * @param {string} path
 * @param {string} category
 */
function completeUrl(country, path = "", category = "") {
  if (path && path[0] !== "/") {
    // sometimes path to next page is broken: href="lody-v-cokolade-a-jogurtu/p3"
    const [_, page] = path.split("/"); // e.g. "lody-v-cokolade-a-jogurtu/p3" => "/p3"
    return `https://www.grizly.${country.toLowerCase()}${category}/${page}`;
  }
  return `https://www.grizly.${country.toLowerCase()}${path}`;
}

function filterTestRequests(requests, userData) {
  return userData.type === ActorType.Test ? requests.slice(0, 10) : requests;
}

function categoryRequest(userData, href, topLevel = false) {
  return {
    url: completeUrl(userData.country, href),
    label: "category",
    userData: Object.assign({}, userData, { category: href, topLevel })
  };
}

function categoriesRequests(document, userData, log) {
  // the menu shows only some subcategories, top-level categories list all of their products
  const links = document.querySelectorAll(".level-1 > a, .sub-menu li a");
  return links.map(link => {
    log.debug(`Queued category "${link.innerText.trim()}"`);
    const topLevel = link.parentElement.classList.contains("level-1");
    return categoryRequest(userData, link.getAttribute("href"), topLevel);
  });
}

/**
 * Top-level promo category (slevy / akce-a-slevy) does not list products of its subcategories
 * (e.g. multipacks in skupinova-baleni), so subcategories of top-level categories are queued too.
 * @param {Document} document
 * @param {object} userData
 */
function subcategoriesRequests(document, userData) {
  const links = document.querySelectorAll(".subcategories a.linkImg2");
  const hrefs = new Set(links.map(link => link.getAttribute("href")));
  return [...hrefs].map(href => categoryRequest(userData, href));
}

/**
 * Category pages are queued all at once from the "last page" link of the first page. Following only
 * the "next page" link is a chain: one page failing all retries silently drops the rest of the
 * category (hundreds of multipacks in /skupinova-baleni). The "next page" link is kept as a fallback.
 * @param {Document} document
 * @param {string} url - URL of the current category page
 * @param {object} userData
 */
function pagesRequests(document, url, userData) {
  const { country, category } = userData;
  const pageUserData = Object.assign({}, userData, { topLevel: false });
  const urls = new Set();

  const firstPageUrl = url.replace(/\/p\d+$/, "");
  const lastPage = Number(document.querySelector(".pagination .last-page")?.dataset?.page);
  if (url === firstPageUrl && lastPage > 1) {
    for (let page = 2; page <= lastPage; page++) {
      urls.add(`${firstPageUrl}/p${page}`);
    }
  }

  const nextPageButton = document.querySelector(".next");
  if (nextPageButton) {
    urls.add(completeUrl(country, nextPageButton.href, category));
  }

  return [...urls].map(url => ({ url, label: "category", userData: pageUserData }));
}

/**
 * @param {Element} prices
 * @returns {{currentPrice: number|null, originalPrice: number|null}}
 */
function parsePrices(prices) {
  const priceVat = cleanPrice(prices.querySelector(".pricevat.price")?.innerText?.trim());
  const priceSaleCode = cleanPrice(prices.querySelector(".sale-code__text")?.innerText?.trim());
  // crossed out price of discounted products and multipacks
  const priceRecom = cleanPrice(prices.querySelector(".price-recom")?.innerText?.trim());

  const currentPrice = priceSaleCode ? priceSaleCode : priceVat;
  const originalPrice = priceRecom ?? (priceSaleCode ? priceVat : null);
  return { currentPrice, originalPrice: originalPrice > currentPrice ? originalPrice : null };
}

/**
 * @param {string} country
 * @param {Document} document
 * @return {Product[]}
 */
function extractProducts(document, country) {
  const category = document.querySelector("[property='og:title']").getAttribute("content");
  const products = document.querySelectorAll(".content__catagories .product");

  return products.map(product => {
    const itemId = product.dataset.id;
    const itemUrl = completeUrl(country, product.querySelector("h3 a").href);
    const itemName = product.querySelector(".product__name").innerText.trim();
    const img = completeUrl(country, product.querySelector(".product--image img").src);

    const prices = product.querySelector(".product__prices");
    const { currentPrice, originalPrice } = parsePrices(prices);

    const inStock = !product.querySelector(".avail_U");
    const currency = currencyByCountry.get(country);
    return {
      slug: new URL(itemUrl).pathname.replaceAll(/\//g, ""),
      itemId,
      itemUrl,
      itemName,
      img,
      discounted: !!originalPrice,
      originalPrice,
      currency,
      currentPrice,
      category,
      inStock
    };
  });
}

function defRouter({ stats }) {
  return createHttpRouter({
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async start({ request, body, crawler }) {
      const { userData } = request;
      const { document } = parseHTML(body.toString());
      const requests = categoriesRequests(document, userData, log);
      const filtered = filterTestRequests(requests, userData);

      if (!filtered.length) {
        throw new Error(`Links to category pages were not found on the start page`);
      }

      stats.add("categories", filtered.length);
      await crawler.addRequests(filtered);
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async category({ request, body, crawler, log }) {
      const { url, userData } = request;
      const { country, type, topLevel } = userData;
      const { document } = parseHTML(body.toString());
      const categoryProductsCountNode = document.querySelector(".item-count")?.value;

      if (!categoryProductsCountNode) {
        return log.error(`No products count node found on ${url}.`); // It probably is not a typical category page
      }

      if (topLevel) {
        const requests = subcategoriesRequests(document, userData);
        stats.add("categories", requests.length);
        await crawler.addRequests(requests);
      }

      if (type !== ActorType.Test) {
        const requests = pagesRequests(document, url, userData);
        stats.add("pages", requests.length);
        await crawler.addRequests(requests);
      }
      const extracted = extractProducts(document, country);
      // some cards (mostly multipacks) link to the homepage instead of the product, they have no product page to track
      const products = extracted.filter(product => product.slug);
      if (products.length < extracted.length) {
        log.warning(`Skipped ${extracted.length - products.length} products without product URL on ${url}`);
        stats.add("skipped", extracted.length - products.length);
      }
      stats.add("items", products.length);
      await Actor.pushData(products);
    }
  });
}

function getStartUrls(urls, country, type) {
  return urls.length
    ? urls
    : [
        {
          url: completeUrl(country),
          label: "start",
          userData: { type, country }
        }
      ];
}

async function main() {
  Rollbar.init();

  const stats = await withPersistedStats({
    categories: 0,
    pages: 0,
    items: 0,
    skipped: 0,
    failed: 0
  });

  const {
    debug,
    type = ActorType.Full,
    country = Country.CZ,
    proxyGroups,
    urls,
    maxConcurrency = 3,
    maxRequestRetries
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    countryCode: country
  });

  const crawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries: Math.max(maxRequestRetries ?? 0, 10),
    maxRequestsPerMinute: 600,
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      sessionOptions: { maxErrorScore: 1 }
    },
    requestHandler: defRouter({ stats }),
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startUrls = getStartUrls(urls, country, type);
  await crawler.run(startUrls);
  await stats.save(true);

  const { items, failed } = stats.get();
  if (!items) {
    throw new Error(`No products scraped (${failed} failed requests) - blocked or site structure changed`);
  }

  const tableName = `grizly_${country.toLowerCase()}`;
  await uploadToKeboola(tableName);
}

await Actor.main(main, { statusMessage: "DONE" });
