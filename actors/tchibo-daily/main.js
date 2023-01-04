import { Actor, Dataset, KeyValueStore, log } from "apify";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "linkedom";

/** @enum {string} */
const Labels = {
  NAVIGATION: "NAVIGATION",
  CATEGORY: "CATEGORY",
  CATEGORY_CAT: "CATEGORY_CAT",
  COFFEE_CATEGORY: "COFFEE_CATEGORY",
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

const ignoredCategories = new Set([
  "https://foto.tchibo.de/",
  "https://reisen.tchibo.de/",
  "aktionen-c400070426.html"
]);

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

function parsePrice(price, userInput) {
  const { country = "cz" } = userInput;
  let result = price.replace(/\s/, "").replace(",", ".");
  result = result.match(/[\d+|.]+/)[0];
  result = parseFloat(result);
  return country === "de" ? result / 100 : result;
}

function getCoffeeCategory(userInput) {
  const { country = "cz" } = userInput;
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

function navigationRequests({ json, userInput }) {
  const requests = [];
  const { country = "cz" } = userInput;
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

function categoryRequests(document) {
  const menu = document.querySelectorAll(
    ".c-tp-sidebarnavigation > ul > li > ul > li > a"
  );
  return menu.map(m => ({
    url: m.getAttribute("href"),
    userData: {
      label: Labels.CATEGORY_CAT
    }
  }));
}

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
  const finalCount = parseInt(
    searchResults.getAttribute("data-result-count"),
    10
  );
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
    page += 1;
    productsCount += 30;
  }
  return requests;
}

function productsFromListing({ document, handledIdsSet, currency, userInput }) {
  const { country = "cz" } = userInput;
  const breadcrumbItems = document.querySelectorAll(
    ".c-tp-breadcrumb-item > a"
  );
  const productList = document.querySelectorAll(
    "div[data-search-result-list-entry]"
  );
  const items = [];
  for (const product of productList) {
    const itemId = product.getAttribute("data-product-id");
    if (handledIdsSet.has(itemId)) continue;
    handledIdsSet.add(itemId);
    const image = product.querySelector(".m-tp-productbox002-image");
    const url = image.parentNode.getAttribute("href");
    const itemName = image.getAttribute("alt");
    const img = image.getAttribute("data-src");
    const currentPrice = product
      .querySelector(".c-tp-price-currentprice")
      .innerText.trim();
    const oldPrice = product
      .querySelector(".c-tp-price-oldprice")
      ?.innerText?.trim();
    const result = {
      itemId,
      itemUrl: url,
      slug: itemSlug(url),
      itemName,
      img: `https://www.tchibo.${country}${img}`,
      discounted: false,
      originalPrice: null,
      currency,
      currentPrice: parsePrice(currentPrice, userInput),
      category: breadcrumbItems.map(p => p.innerText.trim()).join(" > ")
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice, userInput);
    }
    items.push(result);
  }
  return items;
}

function productsFromCoffeeCategory({
  document,
  handledIdsSet,
  currency,
  userInput
}) {
  const { country = "cz" } = userInput;
  const products = document.querySelectorAll(".m-tp-productbox002");
  const items = [];
  for (const p of products) {
    const titleObject = p.querySelector(".m-tp-productbox002-title");
    const itemId = titleObject.querySelector("a").getAttribute("data-pds-link");
    if (handledIdsSet.has(itemId)) continue;
    handledIdsSet.add(itemId);
    const title = titleObject.querySelector("a").getAttribute("title");
    const itemUrl = titleObject.querySelector("a").getAttribute("href");
    if (itemUrl === undefined) break;
    const topLineText = p
      .querySelector(".m-tp-productbox002-topline-text")
      .innerText.trim();
    const name = titleObject.querySelector("a > span").innerText.trim();
    const subName = p
      .querySelector(".m-tp-productbox002-flavor")
      .innerText.trim();
    const img = p
      .querySelector(".m-tp-productbox002-image")
      .getAttribute("data-src");
    const currentPrice = p
      .querySelector(".c-tp-price-currentprice")
      .innerText.trim();
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
      currentPrice: parsePrice(currentPrice, userInput),
      category: getCoffeeCategory(userInput)
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice, userInput);
    }
    items.push(result);
  }
  return items;
}

async function savaProducts({ products, s3 }) {
  return Promise.allSettled([
    Dataset.pushData(products),
    Promise.allSettled(
      products.map(result => {
        uploadToS3v2(s3, result, {
          inStock: true,
          priceCurrency: result.currency
        });
      })
    )
  ]);
}

async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const userInput = (await KeyValueStore.getInput()) || {};
  const { country = "cz", type, development = process.env.TEST } = userInput;
  const currency = getCurrencyISO(country);

  const handledIds = (await Actor.getValue("HANDLED_PRODUCT_IDS")) || [];
  const handledIdsSet = new Set(handledIds);

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"],
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 200,
    useSessionPool: true,
    async requestHandler({ request, log, body, json }) {
      const { label, page } = request.userData;
      const { document } = parseHTML(body.toString());
      log.info(`Processing: [${label}] - [${request.url}]`);

      switch (label) {
        case Labels.LIST:
          {
            await crawler.addRequests(
              paginationRequests({
                document,
                pageNumber: page,
                url: request.url
              })
            );
            const products = productsFromListing({
              document,
              handledIdsSet,
              currency,
              userInput
            });
            await savaProducts({ products, s3 });
          }
          break;
        case Labels.CATEGORY:
          await crawler.addRequests(categoryRequests(document));
          break;
        case Labels.NAVIGATION:
          await crawler.addRequests(navigationRequests({ json, userInput }));
          break;
        case Labels.COFFEE_CATEGORY:
          {
            const products = productsFromCoffeeCategory({
              document,
              handledIdsSet,
              currency,
              userInput
            });
            const subCategoriesRequests = document
              .querySelectorAll(
                ".m-coffee-categoryTeaser--tileWrapper > a, .m-coffee-teaser-slider > a"
              )
              .map(sc => ({
                url: sc.getAttribute("href"),
                userData: {
                  label: Labels.COFFEE_CATEGORY
                }
              }));
            await Promise.allSettled([
              crawler.addRequests(subCategoriesRequests),
              savaProducts({ products, s3 })
            ]);
          }
          break;
        case Labels.CATEGORY_CAT:
          await crawler.addRequests(categoryCatRequests(document));
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.info(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequest =
    type === "test"
      ? {
          url: "https://www.tchibo.cz/lozni-pradlo-c400118928.html",
          userData: {
            label: Labels.LIST,
            page: 0
          }
        }
      : {
          url: `https://www.tchibo.${country}/jsonflyoutnavigation`,
          userData: {
            label: Labels.NAVIGATION
          }
        };
  await crawler.run([startingRequest]);
  log.info("crawler finished");

  await Promise.all([
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", `tchibo.${country}`),
    uploadToKeboola(`tchibo_${country === "com.tr" ? "tr" : country}`)
  ]);
  log.info("invalidated Data CDN");
  log.info("Finished.");
}

await Actor.main(main);
