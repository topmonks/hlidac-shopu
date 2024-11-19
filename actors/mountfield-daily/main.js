import { HttpCrawler, useState } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum {string} */
const Labels = {
  START: "START",
  MAIN_CATEGORY: "MAIN_CATEGORY",
  CATEGORY: "CATEGORY"
};

const rootUrlByCountry = new Map([
  [Country.CZ, "https://www.mountfield.cz/predvypis"],
  [Country.SK, "https://www.mountfield.sk/predvypis"]
]);

/**
 * @param {string} text
 * @return {number|null}
 */
function parsePrice(text) {
  if (!text) return null;
  return parseFloat(text.replace(/\s/g, "").replace("Kč", "").replace("€", "").replace(",", ".").trim());
}

/**
 * @param {Document} document
 * @param {Country} country
 * @param {Stats} stats
 */
function extractItems(document, country, stats) {
  const products = document.querySelectorAll(".list-products__item__in");
  if (!products.length) return [];

  const category = document.querySelectorAll(".box-breadcrumb__item").map(item => item.innerText.trim());
  log.debug(`*********** FOUND ${products.length} items *****************`);
  return products.map(item => {
    const result = {};
    const itemUrl = item.querySelector("a.list-products__item__block").getAttribute("href");
    const itemCode = itemUrl.split("-").at(-1);
    const name = item.querySelector("h2").innerText?.trim();

    const regularPriceSpan = item.querySelector(".list-products__item__info__price__item--main");
    regularPriceSpan.querySelector("span")?.remove();
    const regularPrice = regularPriceSpan.innerText;
    const retailPriceSpan = item.querySelector(".list-products__item__info__price__item--old");
    const recommendedRetailPriceSpan = item.querySelector(".box__future-price__list strong");
    retailPriceSpan?.querySelector("span")?.remove();
    const retailPrice = retailPriceSpan?.innerText;

    result.currentPrice = parsePrice(regularPrice);
    result.originalPrice = parsePrice(retailPrice);
    result.originalPrice ??= parsePrice(recommendedRetailPriceSpan?.innerText);
    result.discounted = false;

    if ((result.originalPrice !== -1 || result.originalPrice !== null) && result.originalPrice > result.currentPrice) {
      result.discounted = true;
    }

    const loyaltyPrice = item.querySelector(".list-products__item__loyalty__link .in-loyalty__highlight")?.innerText;

    result.loyalty = false;
    if (!result.originalPrice && loyaltyPrice) {
      result.originalPrice = parsePrice(regularPrice);
      result.currentPrice = parsePrice(loyaltyPrice);
      result.discounted = result.currentPrice < result.originalPrice;
      result.loyalty = true;
    }

    result.id = itemCode;
    result.itemUrl = itemUrl;
    result.itemId = itemCode;
    result.itemName = name;
    result.category = category.join(" > ");
    result.currency = country === Country.CZ ? "CZK" : "EUR";
    result.img = item.querySelector("img").getAttribute("data-src") || item.querySelector("img").src;
    stats.inc("items");
    return result;
  });
}

/**
 * return name of the table in keboola according the language
 * @param {{type: ActorType, country: Country}} userInput
 * @return {string}
 */
function getTableName({ type, country }) {
  const tableName = `mountfield_${country.toLowerCase()}`;
  if (type === ActorType.BlackFriday) {
    return `${tableName}_bf`;
  }
  return tableName;
}

/**
 * @param {Document} document
 * @return {import("@crawlee/http").RequestOptions[]}
 */
function categoryItemsRequests(document) {
  return document.querySelectorAll(".list-categories__item__block").map(cat => ({
    url: cat.href,
    userData: {
      label: Labels.CATEGORY,
      mainCategory: cat.querySelector("h3").innerText?.trim()
    }
  }));
}

async function main() {
  rollbar.init();

  const processedIds = await useState("processedIds", {});
  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsDuplicity: 0
  });

  const {
    development,
    debug,
    maxRequestRetries,
    proxyGroups,
    country = Country.CZ,
    type = ActorType.Full,
    bfUrl = "https://www.mountfield.cz/black-friday"
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = rootUrlByCountry.get(country);

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 400,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    async requestHandler({ request, body, crawler }) {
      const {
        url,
        userData: { label }
      } = request;
      const { document } = parseHTML(body.toString());
      log.debug(`Scraping [${label}] - ${url}`);

      switch (label) {
        case Labels.START:
          {
            const requests = categoryItemsRequests(document);
            stats.add("categories", requests.length);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Labels.CATEGORY: {
          const { mainCategory } = request.userData;
          const categories = document.querySelectorAll(
            `.list-categories__item__block,
     .list-categories-with-article__box`
          );
          if (categories.length) {
            const requests = categories.map(cat => {
              return {
                url: cat.getAttribute("href"),
                userData: {
                  label: Labels.CATEGORY,
                  mainCategory
                }
              };
            });
            stats.add("categories", categories.length);
            log.debug(`Found categories ${categories.length}`);
            await crawler.requestQueue.addRequests(requests);
          }
          const products = extractItems(document, country, stats);
          await saveUniqProducts({
            products,
            stats,
            processedIds
          });

          const href = document.querySelector("a.in-paging__control__item--arrow-next")?.getAttribute("href");
          if (!href) return;
          const paginationUrl = new URL(href, request.url).href;
          log.debug(`Found pagination page ${paginationUrl}`);
          await crawler.requestQueue.addRequest({
            url: paginationUrl,
            userData: {
              label: Labels.CATEGORY,
              mainCategory
            }
          });
          break;
        }
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  switch (type) {
    case ActorType.Full:
      startingRequests.push({
        url: rootUrl,
        userData: {
          label: Labels.START
        }
      });
      break;
    case ActorType.BlackFriday:
      startingRequests.push({
        url: bfUrl,
        userData: {
          label: Labels.MAIN_CATEGORY,
          mainCategory: "Black Friday"
        }
      });
      break;
    case ActorType.Test:
      startingRequests.push({
        url: "https://www.mountfield.sk/pily-prislusenstvo-retaze",
        userData: {
          label: Labels.CATEGORY,
          mainCategory: "TEST"
        }
      });
      break;
  }
  await crawler.run(startingRequests);
  log.info("crawler finished");

  await stats.save(true);

  if (!development) {
    const tableName = getTableName({ type, country });
    await uploadToKeboola(tableName);
  }
  log.info("Finished.");
}

await Actor.main(main);
