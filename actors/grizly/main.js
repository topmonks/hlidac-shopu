import { Dataset, HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
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

function cleanPrice(string) {
  if (!string) {
    return undefined;
  }
  return Number(string.replace(/\D/g, ""));
}

function categoriesRequests(document, userData, log) {
  const links = document.querySelectorAll(".sub-menu--3 li a");
  return links.map(link => {
    log.debug(`Queued category "${link.innerText.trim()}"`);
    const href = link.getAttribute("href");
    const url = completeUrl(userData.country, href);
    return {
      url,
      label: "category",
      userData: Object.assign({}, userData, { category: href })
    };
  });
}

/**
 * @param {string} country
 * @param {Document} document
 * @return {Product[]}
 */
function extractProducts(document, country) {
  const category = document.querySelector("h1").innerText.trim();
  const products = document.querySelectorAll(".content__catagories .product");

  return products.map(product => {
    const itemId = product.getAttribute("data-id");
    const itemUrl = completeUrl(country, product.querySelector("h3 a").getAttribute("href"));
    const itemName = product.querySelector(".product__header-name").innerText;
    const img = completeUrl(country, product.querySelector(".product__image img").getAttribute("src"));
    const currentPrice = cleanPrice(product.querySelector(".product__prices .pricevat.price").innerText.trim());
    const originalPrice = cleanPrice(product.querySelector(".product__prices .pricerecom")?.innerText.trim());
    const inStock = !product.querySelector(".watchDog");
    const currency = currencyByCountry.get(country);
    return {
      slug: new URL(itemUrl).pathname,
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
      stats.add("categories", filtered.length);
      await crawler.addRequests(filtered);
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async category({ request, body, crawler, log }) {
      const { url, userData } = request;
      const { country, type, category } = userData;
      const { document } = parseHTML(body.toString());
      const categoryProductsCountNode = document.querySelector("#itemscount").value;
      if (!categoryProductsCountNode) {
        return log.error(`No products count node found on ${url}`);
      }

      const nextPageButton = document.querySelector(".next");
      if (nextPageButton && type !== ActorType.Test) {
        await crawler.requestQueue.addRequests([
          {
            url: completeUrl(country, nextPageButton.getAttribute("href"), category),
            label: "category",
            userData
          }
        ]);
      }
      const products = extractProducts(document, country);
      stats.add("items", products.length);
      await Dataset.pushData(products);
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

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    failed: 0
  });

  const {
    debug,
    type = ActorType.Full,
    country = Country.CZ,
    proxyGroups,
    urls,
    maxConcurrency = 25,
    maxRequestRetries
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries,
    maxRequestsPerMinute: 600,
    proxyConfiguration,
    requestHandler: defRouter({ stats }),
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startUrls = getStartUrls(urls, country, type);
  await crawler.run(startUrls);
  await stats.save(true);

  const tableName = `grizly_${country.toLowerCase()}`;
  await uploadToKeboola(tableName);
}

await Actor.main(main, { statusMessage: "DONE" });
