import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Actor, Dataset, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";

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
  CZ: "https://nakup.itesco.cz/groceries/cs-CZ/shop/ovoce-a-zelenina?include-children=true",
  SK: "https://potravinydomov.itesco.sk/groceries/sk-SK/shop/ovocie-a-zelenina?include-children=true"
};

function flattenChildren(array) {
  let result = [];
  for (const a of array) {
    result.push(a);
    if (Array.isArray(a.children)) {
      result = result.concat(flattenChildren(a.children));
    }
  }
  return result;
}

function findArraysUrl(urlsCatHtml, country) {
  const { navList } = urlsCatHtml.taxonomy;
  const childrenArr = [];
  for (const item of flattenChildren(navList)) {
    if (item.children) {
      for (const url of item.children) {
        childrenArr.push(url);
      }
    }
  }
  const arr = [].concat(childrenArr).map(item => {
    return item.url.includes("/all") ? item.url : item.allUrl;
  });

  const url =
    country === Country.CZ
      ? "https://nakup.itesco.cz/groceries/cs-CZ/shop"
      : "https://potravinydomov.itesco.sk/groceries/sk-SK/shop";
  return arr.map(item => `${url}${item}`);
}

/**
 * @param {number} productId
 * @param {Object} reduxResults
 */
function getProductFromRedux(productId, reduxResults) {
  const objReduxResults = Object.fromEntries(reduxResults);
  if (objReduxResults[productId]) {
    const { product } = objReduxResults[productId];
    if (product) {
      return product;
    }
  }
}

function extractItems({ document, country, uniqueItems, stats }) {
  const rootUrl =
    country === Country.CZ
      ? "https://nakup.itesco.cz"
      : "https://potravinydomov.itesco.sk";
  const category = document
    .querySelectorAll(".breadcrumbs ol li")
    .map(li => li.innerText)
    .filter(Boolean);

  const body = document.querySelector("body");
  const reduxData = JSON.parse(body.getAttribute("data-redux-state"));
  let resultsData = null;
  if (reduxData) {
    const { results } = reduxData;
    stats.add("offers", results.count);
    const { pages } = reduxData.results;
    // Use filter on paginated pages that includes null elements in pages array
    const filteredPages = pages.filter(Boolean);
    resultsData = filteredPages?.[0]?.serializedData;
  }

  return document
    .querySelectorAll(".product-list--list-item")
    .map(item => {
      let itemId = parseInt(item.querySelector(".tile-content"));
      if (!itemId && item.querySelector("a.product-image-wrapper")) {
        itemId = parseInt(
          item
            .querySelector("a.product-image-wrapper")
            .getAttribute("href")
            .replace(/^.+products\//, "")
        );
      }
      if (uniqueItems.has(itemId)) return;

      const result = {
        itemId,
        category,
        currency: country === Country.CZ ? "CZK" : "EUR",
        currentPrice: cleanPrice(
          item.querySelector(".beans-price__text")?.innerText
        ),
        currentUnitPrice: cleanPrice(
          item.querySelector(".beans-price__subtext")?.innerText
        ),
        discounted: false,
        itemUrl: `${rootUrl}${item
          .querySelector(".product-image-wrapper")
          ?.getAttribute("href")}`
      };

      const offer = item.querySelector(
        ".product-details--wrapper .offer-text"
      )?.innerText;
      if (offer && !offer.includes("Clubcard")) {
        result.discounted = true;

        if (country === Country.CZ) {
          result.currentPrice = cleanPrice(offer.split("nyní")[1]);
          result.originalPrice = cleanPrice(
            offer.replace(/^.+cena|nyní.+/g, "")
          );
        } else {
          result.currentPrice = cleanPrice(offer.split("teraz")[1]);
          const match = offer.match(/(predtým) ([\d+|,]+)/);
          if (match && match.length === 3) {
            result.originalPrice = cleanPrice(match[2]);
          }
        }

        result.useUnitPrice = Boolean(
          item.querySelector(".beans-quantity-controls__option") ||
            item.querySelector(".beans-radio-button-with-label__label")
        );
        if (result.useUnitPrice) {
          result.originalUnitPrice = result.originalPrice;
          result.unitOfMeasure = "0.1kg";
          result.currentPrice /= 10;
          result.originalPrice /= 10;
        }
      }

      const productRedux = getProductFromRedux(itemId, resultsData);
      result.itemName = productRedux.title;
      result.img = productRedux.defaultImageUrl;
      result.inStock = productRedux.status === "AvailableForSale";

      if (!result.currentPrice && result.inStock) {
        log.error("Missing price", result);
      }

      uniqueItems.add(result.itemId);
      return result;
    })
    .filter(Boolean);
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

/**
 * @param {Document} document
 * @param {Country} country
 */
function startUrls(document, country) {
  const script = document
    .querySelector("body")
    .getAttribute("data-redux-state");
  const urlsCatHtml = JSON.parse(script);
  return findArraysUrl(urlsCatHtml, country);
}

/**
 * @param {string} url
 * @param {string} lastPage
 * @returns {string[]}
 */
function pagesUrls(url, lastPage) {
  const parsedLastPage = parseInt(lastPage);
  if (parsedLastPage > 1 && url.includes("?page=")) {
    return restPageUrls(parsedLastPage, page => `${url}?page=${page}`);
  }
}

async function startCrawler(crawler, { type, country, bfUrl, testUrl }) {
  let startingRequest;
  if (type === ActorType.Full) {
    startingRequest = {
      url: country === Country.CZ ? StartUrls.CZ : StartUrls.SK,
      userData: {
        label: Labels.Start
      }
    };
  } else if (type === ActorType.BlackFriday) {
    startingRequest = {
      url: bfUrl,
      userData: {
        label: Labels.PageBF
      }
    };
  } else if (type === ActorType.Test) {
    startingRequest = {
      url: testUrl,
      userData: {
        label: Labels.Page
      }
    };
  }
  await crawler.run([startingRequest]);
}

/**
 * @param {Document} document
 * @param {Country} country
 */
function extractBFItems(document, country) {
  return document
    .querySelectorAll(".a-productListing__productsGrid__element")
    .map(el => {
      const itemUrl = el.querySelector("a.ghs-link").getAttribute("href");
      if (!itemUrl) {
        return;
      }
      const originalPrice =
        parseFloat(
          el
            .querySelector(".product__old-price")
            .innerText.trim()
            .replace(",", "")
            .replace(/\s+/g, "")
        ) / 100;
      const currentPrice =
        parseFloat(
          el
            .querySelector(".product__price ")
            .innerText.trim()
            .replace(/\s+/g, "")
        ) / 100;
      log.info(`Found  ${itemUrl}`);
      return {
        itemId: itemSlug(itemUrl),
        itemUrl,
        itemName: el.querySelector(".product__name").innerText,
        img: `https://itesco.${country.toLowerCase()}${el
          .querySelector(".product__img-wrapper img")
          .getAttribute("data-src")}`,
        originalPrice,
        currentPrice,
        discounted: originalPrice ? originalPrice > currentPrice : false,
        category:
          country.toLowerCase() === "cz"
            ? ["Akční nabídky"]
            : ["Špeciálne ponuky"],
        currency: country.toLowerCase() === "cz" ? "CZK" : "EUR"
      };
    });
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    offers: 0,
    failed: 0
  });
  const uniqueItems = new Set();

  const {
    development,
    proxyGroups,
    maxRequestRetries = 5,
    country = Country.CZ,
    type = ActorType.Full,
    bfUrl = "https://itesco.cz/akcni-nabidky/seznam-produktu/black-friday/",
    testUrl = "https://nakup.itesco.cz/groceries/cs-CZ/shop/alkoholicke-napoje/whisky-a-bourbon/bourbon/all"
  } = await getInput();

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const crawler = new HttpCrawler({
    maxRequestRetries,
    proxyConfiguration,
    requestHandlerTimeoutSecs: 60,
    maxRequestsPerMinute: 500,
    async requestHandler({ request, body, enqueueLinks }) {
      const { document } = parseHTML(body.toString());
      log.info(`Processing ${request.url}, ${request.userData.label}`);
      switch (request.userData.label) {
        case Labels.Start:
          {
            const urls = startUrls(document, country);
            log.debug(
              `Found ${startUrls.length} on ${request.url} ${request.userData.label}`
            );
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.Page
              }
            });
          }
          break;
        case Labels.Page:
          {
            const lastPage = document
              .querySelectorAll(".pagination--page-selector-wrapper ul li") // :nth-last-child(2) throws for some reason
              .slice(-2, -1)?.[0]?.innerText;
            const urls = pagesUrls(request.url, lastPage);
            if (urls) {
              log.debug(
                `Found ${urls.length} on ${request.url} ${request.userData.label}`
              );
              await enqueueLinks({
                urls,
                userData: {
                  label: Labels.Pagination
                }
              });
            }
            const items = extractItems({
              document,
              country,
              uniqueItems,
              stats
            });
            await Dataset.pushData(items);
          }
          break;
        case Labels.PageBF:
          {
            const lastPage = document
              .querySelector(".ddl_plp_pagination .page a:last-child")
              ?.innerText?.trim();
            const urls = pagesUrls(request.url, lastPage);
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.PageBF
              }
            });
            const items = extractBFItems(document, country);
            await Dataset.pushData(items);
          }
          break;
        case Labels.Pagination:
          {
            const items = extractItems({
              document,
              country,
              uniqueItems,
              stats
            });
            log.debug(`Found ${items.length} storing them, ${request.url}`);
            await Dataset.pushData(items);
          }
          break;
      }
    },
    failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await startCrawler(crawler, { type, country, bfUrl, testUrl });
  await stats.save(true);

  if (!development) {
    await uploadToKeboola(getTableName(country, type));
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main);
