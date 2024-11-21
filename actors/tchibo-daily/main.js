import { HttpCrawler, useState } from "@crawlee/http";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Labels = {
  NAVIGATION: "NAVIGATION",
  CATEGORY: "CATEGORY",
  CATEGORY_CAT: "CATEGORY_CAT",
  COFFEE_CATEGORY: "COFFEE_CATEGORY",
  JSON_LIST: "JSON_LIST",
  JSON_NAVIGATION: "JSON_NAVIGATION",
  LIST: "LIST"
};

const coffeeCategories = new Set([
  "svet-kavy-c37.html",
  "kava-cely-sortiment-tchibo-prehledne-c400061792.html",
  "kava-zo-100-zrniek-arabica-dokonaly-pozitok-c400004921.html",
  "kaffeezubereiter-c400004285.html",
  "kaffee-zubehoer-c400004286.html",
  "kaffeegeschenke-c400004887.html",
  "kaffee-aus-100-arabica-bohnen-vollkommener-kaffeegenuss-bei-t-c39.html",
  "kawa-w-100-z-ziaren-arabiki-przyjemnosc-picia-kawy-z-tchibo-c32.html",
  "100-arabica-kavebabbol-keszult-kave-tokeletes-kaveelmeny-a-tc-c400004916.html",
  "tchibo-kahve-cesitleri-c400011809.html",
  "kaffee-aus-100-arabica-bohnen-vollkommener-kaffeegenuss-bei-t-c15.html"
]);

const ignoredCategories = new Set(["https://foto.tchibo.de/", "https://reisen.tchibo.de/", "aktionen-c400070426.html"]);

/**
 * @param {string} country
 */
function getCurrencyISO(country) {
  switch (country) {
    case "cz":
      return "CZK";
    case "sk":
    case "de":
    case "at":
      return "EUR";
    case "ch":
      return "CHF";
    case "pl":
      return "PLN";
    case "hu":
      return "HUF";
    case "com.tr":
      return "TRY";
    default:
      return null;
  }
}

/**
 * @param {string} price
 * @param {string} country
 */
function parsePrice(price, country) {
  const result = parseFloat(
    price
      .replace(/\s/, "")
      .replace(",", ".")
      .match(/[\d+|.]+/)[0]
  );
  return country === "de" ? result / 100 : result;
}

/**
 * @param {string} country
 */
function getCoffeeCategory(country) {
  switch (country) {
    case "cz":
      return "Káva";
    case "sk":
      return "Káva";
    case "de":
      return "Kaffee";
    case "ch":
      return "Kaffee";
    case "pl":
      return "Kawa";
    case "hu":
      return "Kávé";
    case "at":
      return "Kaffee";
    case "com.tr":
      return "Kahve";
  }
}

function prepareCategoryJsonUrl(path, country, page) {
  return `https://www.tchibo.cz/service/categoryfrontend/api/categories/products?path=${path}&site=${country.toUpperCase()}&page=${page}&sorting=relevance`;
}

function jsonNavigationRequests({ json, country }) {
  const requests = [];
  const categories = json.categories.flatMap(category => category.children);
  const page = 1;
  for (const { href: path, title } of categories) {
    requests.push({
      url: prepareCategoryJsonUrl(path, country, page),
      userData: {
        label: Labels.JSON_LIST,
        scraped: 0,
        page,
        path,
        category: title,
      },
    })
  }
  return requests;
}

function productsFromJsonListing({ json, handledIdsSet, currency, country, userData: { category } }) {
  const products = [];
  const { metadata, items } = json;
  const numProductsScraped = items.length;
  const baseUrl = `https://www.tchibo.${country}`;
  for (const item of items) {
    if (handledIdsSet[item.id]) continue;
    handledIdsSet[item.id] = true;
    const {
      id,
      imageUrlSmallSize,
      price,
      productViewUrl,
      title,
    } = item;
    const itemUrl = `${baseUrl}/${productViewUrl}`;
    const result = {
      itemId: id,
      itemName: title,
      itemUrl,
      slug: itemSlug(itemUrl),
      img: `${baseUrl}${imageUrlSmallSize}`,
      // NOTE: `249,00Kč` is represented as 24900
      originalPrice: null,
      currentPrice: price.current / 100,
      discounted: false,
      currency,
      category,
    }
    if (price.old!== 0) {
      result.discounted = true;
      result.originalPrice = price.bestPriceAmount / 100;
    }
    products.push(result);
  }
  const { numFoundAvailable } = metadata;
  return { products, numFoundAvailable, numProductsScraped };
}

function navigationRequests({ json, country }) {
  const requests = [];
  for (const { children } of json.list) {
    for (const { href } of children) {
      if (ignoredCategories.has(href)) continue;
      if (coffeeCategories.has(href)) {
        requests.push({
          url: new URL(href, `https://www.tchibo.${country}/`).href,
          userData: {
            label: Labels.COFFEE_CATEGORY
          }
        });
      } else {
        requests.push({
          url: new URL(href, `https://www.tchibo.${country}/`).href,
          userData: {
            label: Labels.CATEGORY
          }
        });
      }
    }
  }
  return requests;
}

/**
 * @param {Document} document
 */
function categoryRequests(document) {
  const menu = document.querySelectorAll(".c-tp-sidebarnavigation > ul > li > ul > li > a");
  return menu.map(m => ({
    url: m.getAttribute("href"),
    userData: {
      label: Labels.CATEGORY_CAT
    }
  }));
}

/**
 * @param {Document} document
 */
function categoryCatRequests(document) {
  const selectedCategory = document.querySelectorAll("a.active ~ ul > li > a");
  return selectedCategory.map(s => ({
    url: s.getAttribute("href"),
    userData: {
      label: Labels.LIST,
      page: 0
    }
  }));
}

function paginationRequests({ document, pageNumber, url }) {
  if (pageNumber !== 0) return [];

  const searchResults = document.querySelector(".searchResults");
  const finalCount = parseInt(searchResults.getAttribute("data-result-count"), 10);
  if (finalCount <= 30) return [];

  let page = 2;
  let productsCount = 0;

  const requests = [];
  while (productsCount < finalCount) {
    requests.push({
      url: `${url}?page=${page}`,
      userData: {
        label: Labels.LIST,
        page
      }
    });
    page++;
    productsCount += 30;
  }
  return requests;
}

function productsFromListing({ document, handledIdsSet, currency, country }) {
  const breadcrumbItems = document.querySelectorAll(".c-tp-breadcrumb-item > a");
  const productList = document.querySelectorAll("div[data-search-result-list-entry]");
  const items = [];
  for (const product of productList) {
    const itemId = product.getAttribute("data-product-id");
    if (handledIdsSet[itemId]) continue;
    handledIdsSet[itemId] = true;
    const image = product.querySelector(".m-tp-productbox002-image, .m-tp-productbox-imageitem");
    const url = image.parentNode.getAttribute("href");
    const itemName = image.getAttribute("alt");
    const img = image.getAttribute("src");
    const currentPrice = product
      .querySelector(".c-tp-price-currentprice, .m-tp-productbox-info-currentprice")
      .innerText.trim();
    const oldPrice = product.querySelector(".c-tp-price-oldprice, .m-tp-productbox-info-oldprice")?.innerText?.trim();
    const result = {
      itemId,
      itemUrl: url,
      slug: itemSlug(url),
      itemName,
      img: `https://www.tchibo.${country}${img}`,
      discounted: false,
      originalPrice: null,
      currency,
      currentPrice: parsePrice(currentPrice, country),
      category: breadcrumbItems.map(p => p.innerText.trim()).join(" > ")
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice, country);
    }
    items.push(result);
  }
  return items;
}

function productsFromCoffeeCategory({ document, handledIdsSet, currency, country }) {
  const products = document.querySelectorAll(".m-tp-productbox002");
  const items = [];
  for (const p of products) {
    const titleObject = p.querySelector(".m-tp-productbox002-title");
    const itemId = titleObject.querySelector("a[data-pds-link]")?.getAttribute("data-pds-link");
    if (!itemId) {
      log.warning(`No itemId found for title: ${titleObject.innerText}`);
      continue;
    }
    if (handledIdsSet[itemId]) continue;
    handledIdsSet[itemId] = true;
    const title = titleObject.querySelector("a").getAttribute("title");
    const itemUrl = titleObject.querySelector("a").getAttribute("href");
    if (itemUrl === undefined) break;
    const topLineText = p.querySelector(".m-tp-productbox002-topline-text").innerText.trim();
    const name = titleObject.querySelector("a > span").innerText.trim();
    const subName = p.querySelector(".m-tp-productbox002-flavor").innerText.trim();
    const img = p.querySelector(".m-tp-productbox002-image").getAttribute("data-src");
    const currentPrice = p.querySelector(".c-tp-price-currentprice").innerText.trim();
    const oldPrice = p.querySelector(".c-tp-price-oldprice")?.innerText?.trim();
    const result = {
      itemId,
      itemUrl,
      slug: itemSlug(itemUrl),
      itemName: `${topLineText ? `${topLineText} - ` : ""}${
        title ? `${title} - ` : ""
      }${name}${subName ? ` - ${subName}` : ""}`,
      img: `https://www.tchibo.${country}/${img}`,
      originalPrice: null,
      discounted: false,
      currency,
      currentPrice: parsePrice(currentPrice, country),
      category: getCoffeeCategory(country)
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice, country);
    }
    items.push(result);
  }
  return items;
}

async function main() {
  rollbar.init();
  const handledIdsSet = await useState("HANDLED_PRODUCT_IDS", {});

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    failed: 0
  });

  const { country = "cz", type, development = process.env.TEST } = await getInput();
  const currency = getCurrencyISO(country);

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"],
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 200,
    useSessionPool: true,
    persistCookiesPerSession: true,
    async requestHandler({ request, log, body, json }) {
      const { userData } = request;
      const { label, page } = userData;
      const { document } = parseHTML(body.toString());
      log.info(`[${label}] - Processing [${request.url}]`);

      switch (label) {
        case Labels.JSON_NAVIGATION: {
          const requests = jsonNavigationRequests({ json, country });
          log.info(`[${label}] - [${request.url}] - Found ${requests.length} categories`);
          await crawler.addRequests(requests);
          break;
        }
        case Labels.JSON_LIST: {
          const { products, numFoundAvailable, numProductsScraped } = productsFromJsonListing({
            json,
            handledIdsSet,
            currency,
            country,
            userData,
          });

          const scraped = userData.scraped + numProductsScraped;
          const page = userData.page + 1;

          log.info(`[${label}] - [${request.url}] - Found ${numProductsScraped} (${products.length} unique) products, total ${scraped}/${numFoundAvailable}`);
          await Dataset.pushData(products);

          const nextUserData = {
            ...userData,
            scraped,
            page,
          };

          // we want to enqueue next page if `products` is not empty and we haven't reached `numFoundAvailable`
          if (numProductsScraped > 0 && scraped < numFoundAvailable) {
            const url = prepareCategoryJsonUrl(userData.path, country, page);
            await crawler.addRequests([{
              url,
              userData: nextUserData,
            }]);
          }
        }
        case Labels.LIST:
          {
            await crawler.addRequests(
              paginationRequests({
                document,
                pageNumber: page,
                url: request.url
              }),
              { forefront: true }
            );
            const products = productsFromListing({
              document,
              handledIdsSet,
              currency,
              country
            });
            await Dataset.pushData(products);
          }
          break;
        case Labels.CATEGORY:
          await crawler.addRequests(categoryRequests(document));
          break;
        case Labels.NAVIGATION:
          await crawler.addRequests(navigationRequests({ json, country }));
          break;
        case Labels.COFFEE_CATEGORY:
          {
            const products = productsFromCoffeeCategory({
              document,
              handledIdsSet,
              currency,
              country
            });
            const subCategoriesRequests = document
              .querySelectorAll(".m-coffee-categoryTeaser--tileWrapper > a, .m-coffee-teaser-slider > a")
              .map(sc => ({
                url: sc.getAttribute("href"),
                userData: {
                  label: Labels.COFFEE_CATEGORY
                }
              }));
            log.info(`[${label}] - [${request.url}] - Found ${products.length} products`);
            await Promise.allSettled([crawler.addRequests(subCategoriesRequests), Dataset.pushData(products)]);
          }
          break;
        case Labels.CATEGORY_CAT:
          await crawler.addRequests(categoryCatRequests(document));
      }
      stats.inc("urls");
    },
    async failedRequestHandler({ request, log }, error) {
      log.info(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startNavigationRequests = [
    {
      url: `https://www.tchibo.${country}/jsonflyoutnavigation`,
      userData: {
        label: Labels.NAVIGATION,
      }
    },
    // most non-coffee categories & products are found at this enpoint
    {
      url: `https://www.tchibo.${country}/service/categoryfrontend/api/categories/navigation-tree?site=${country.toUpperCase()}`,
      userData: {
        label: Labels.JSON_NAVIGATION,
      }
    }
  ];

  const startingRequests =
    type === "test"
      ? [{
        url: "https://www.tchibo.cz/service/categoryfrontend/api/categories/navigation-tree?site=CZ",
        userData: {
          label: Labels.JSON_NAVIGATION,
          page: 0
        }
      }]
      : startNavigationRequests;
  await crawler.run(startingRequests);
  log.info("crawler finished");

  if (!development) {
    await uploadToKeboola(`tchibo_${country === "com.tr" ? "tr" : country}`);
  }
  log.info("invalidated Data CDN");
  log.info("Finished.");
}

await Actor.main(main);
