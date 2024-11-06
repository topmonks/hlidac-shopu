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

/** @enum {string} */
const Labels = {
  HOME_PAGE: "HOME_PAGE",
  CATEGORY_PAGE: "CATEGORY_PAGE",
  DETAIL_PAGE: "DETAIL_PAGE",
  COUNT: "COUNT",
  COUNT_PRODUCT: "COUNT_PRODUCT",
  BF: "BF"
};

const SITEMAP_URL_CZ = "https://www.notino.cz/sitemap.xml";
const SITEMAP_URL_SK = "https://www.notino.sk/sitemap.xml";
const BASE_URL = "https://www.notino.cz";
const BASE_URL_SK = "https://www.notino.sk";
const BASE_URL_CZ_BF = "https://www.notino.cz/black-friday/";
const BASE_URL_SK_BF = "https://www.notino.sk/black-friday/";

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/**
 * @param {Country} country
 */
function getRootUrl(country) {
  return !country || country === Country.CZ ? BASE_URL : BASE_URL_SK;
}

/**
 * @param {Document} document
 * @param {Country} country
 */
function homepageRequests(document, country) {
  log.debug("Home page");
  const jsonMainMenu = document.querySelector('script[id="main-menu-state"]').innerHTML;
  const mainMenu = JSON.parse(jsonMainMenu);
  const rootUrl = getRootUrl(country);
  const links = [];
  if (mainMenu) {
    const categories = mainMenu.fragmentContextData.DataProvider.categories;
    for (const category of categories) {
      if (category.columns.length > 0) {
        for (const column of category.columns) {
          for (const subCat of column.subCategories) {
            if (subCat.isLink && !subCat.link.includes("https")) {
              links.push({
                url: `${rootUrl}${subCat.link}`,
                userData: {
                  label: Labels.CATEGORY_PAGE
                }
              });
            }
            for (const pt of subCat.productTypes) {
              if (!pt.link.includes("https")) {
                links.push({
                  url: `${rootUrl}${pt.link}`,
                  userData: {
                    label: Labels.CATEGORY_PAGE
                  }
                });
              }
            }
          }
        }
      } else if (!category.link.includes("https")) {
        links.push({
          url: `${rootUrl}${category.link}`,
          userData: {
            label: Labels.CATEGORY_PAGE
          }
        });
      }
    }
  }
  log.info(`Found categories ${links.length}`);
  return links;
}

function determineCurrentAndOriginalPrice(variantGeneralData) {
      // Data contain following prices
      const voucherDiscountedPrice = variantGeneralData.attributes?.VoucherDiscount?.discountedPrice;
      const price = variantGeneralData.price.value;
      const originalPrice = variantGeneralData.originalPrice?.value;
      const recentMinPrice = variantGeneralData.recentMinPrice?.value;

      console.log({ voucherDiscountedPrice, price, originalPrice, recentMinPrice });


      // Some products are automatically discounted using vouchers available for everyone.
      // In this case, we should take it as the current price, and return the price without voucher as original price
      if (voucherDiscountedPrice) {
        return {
          currentPrice: voucherDiscountedPrice,
          originalPrice: recentMinPrice ?? originalPrice,
        }
      }

      // Otherwise price is current price, and original price becomes trickier.
      return {
        currentPrice: price,
        originalPrice: recentMinPrice && price < recentMinPrice && recentMinPrice < originalPrice
          ? recentMinPrice
          : originalPrice,
      }

}

/**
 * @param {Document} document
 * @param {Country} country
 */
function handleProductUsingWindowObject(document, country) {
  log.debug("Handled by windowObject");
  const dataStringFromScriptTag = document.querySelector("#__APOLLO_STATE__")?.innerHTML;
  const productData = JSON.parse(dataStringFromScriptTag.replace(/;/g, ""));
  let productGeneralData = Object.entries(productData).find(([_key, value]) => value?.category);
  productGeneralData = (productGeneralData || ["", {}])[1];
  const variants = [];
  let itemBrand = "";
  for (const key in productData) {
    if (key.includes("Brand:")) {
      itemBrand = productData[key].name;
    }
    if (productData.hasOwnProperty(key) && /^CatalogVariant:\d+$/.test(key)) {
      variants.push(parseInt(key.replace("CatalogVariant:", ""), 10));
    }
  }
  const category = ["category", "subCategory", "type"]
    .filter(key => productGeneralData[key])
    .map(key => productGeneralData[key].join("/"))
    .join("/");

  const rootUrl = getRootUrl(country);

  return variants
    .map(variant => {
      const variantGeneralData = productData[`CatalogVariant:${variant}`];
      if (variantGeneralData.availability.state !== "CanBeBought") return;
      const productName = `${itemBrand} ${variantGeneralData.name ? variantGeneralData.name : ""} ${
        variantGeneralData.variantName ? variantGeneralData.variantName : ""
      } ${variantGeneralData.additionalInfo ? variantGeneralData.additionalInfo : ""}`;
      const product = {
        itemId: `${variantGeneralData.webId}`,
        itemUrl: `${rootUrl}${variantGeneralData.url}`,
        itemName: productName.trim(),
        discounted: false,
        currentPrice: null,
        originalPrice: null,
        currency: null,
        img: null
      };
      product.img = document.querySelector("#pd-image-main")?.getAttribute("src");
      product.category = category;

      const { currentPrice, originalPrice } = determineCurrentAndOriginalPrice(variantGeneralData);

      product.discounted = originalPrice !== null ? currentPrice < originalPrice : false;
      product.currentPrice = currentPrice;
      product.originalPrice = originalPrice;
      product.currency = variantGeneralData.price && variantGeneralData.price.currency;
      product.inStock = true;
      return product;
    })
    .filter(Boolean);
}

/**
 * @param {Document} document
 * @param {import("@crawlee/http").Request} request
 */
function handleProductUsingHTML(document, request) {
  log.debug("Handled by HTML");
  return document.querySelector("#variants li").map(variant => {
    const product = {
      itemId: `${variant.querySelector('input[name="nComID"]').getAttribute("value")}`,
      itemUrl: `${request.url}`,
      itemName: `${variant.querySelector('input[name="NameItem"]').getAttribute("value")}`,
      discounted: false,
      currentPrice: 0,
      originalPrice: null
    };

    product.img = document.querySelector("#pd-image-main")?.getAttribute("src");
    const currentPrice = parseInt(variant.querySelector('input[name="price"]').getAttribute("value"), 10);
    const originalPriceEl = variant.querySelector(".price span span strong");
    const originalPrice = originalPriceEl ? parseInt(originalPriceEl.innerText, 10) : null;
    product.discounted = originalPrice !== null ? currentPrice < originalPrice : false;
    product.currentPrice = currentPrice ?? null;
    product.originalPrice = product.discounted ? originalPrice : null;
    product.inStock = true;
    return product;
  });
}

async function main() {
  log.info("ACTOR - start");

  const processedIds = await useState("processedIds", {});

  rollbar.init();

  const {
    debug,
    development,
    proxyGroups,
    maxRequestRetries,
    country = Country.CZ,
    type = ActorType.Full,
    testUrls,
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    categoriesDone: 0,
    items: 0,
    pages: 0,
    itemsDuplicity: 0,
    crawledProducts: 0,
    JSON: 0,
    HTML: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 600
    },
    ignoreSslErrors: true,
    async requestHandler({ request, body, crawler }) {
      log.info(`Processing ${request.url}, ${request.userData.label}`);
      const { document } = parseHTML(body.toString());
      switch (request.userData.label) {
        case Labels.HOME_PAGE: {
          {
            const requests = homepageRequests(document, country);
            stats.add("categories", requests.length);
            stats.add("pages", requests.length);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        }
        case Labels.BF:
        case Labels.CATEGORY_PAGE:
          {
            const paginationNext = document.querySelector('[rel="next"]')?.getAttribute("href");
            if (paginationNext) {
              await crawler.requestQueue.addRequest(
                {
                  url: paginationNext,
                  userData: {
                    label: Labels.CATEGORY_PAGE
                  }
                },
                { forefront: true }
              );
              log.debug(`Found next pagination page ${paginationNext}`);
              stats.inc("pages");
            }

            const requests = document.querySelectorAll("div[data-product] a").map(a => {
              const url = new URL(request.url);
              return {
                url: `${url.origin}${a.href}`,
                userData: { label: Labels.DETAIL_PAGE }
              };
            });
            await crawler.requestQueue.addRequests(requests);
            log.debug(`Queued ${requests.length}x products detail`);
            stats.add("pages", requests.length);
          }
          break;
        case Labels.DETAIL_PAGE: {
          {
            if (document.querySelector("div#pdVariantsTile")) {
              const productVariants = document.querySelectorAll("div#pdVariantsTile li a").map(a => {
                const url = new URL(request.url);
                return {
                  url: `${url.origin}${a.href}`,
                  userData: { label: Labels.DETAIL_PAGE }
                };
              });
              await crawler.requestQueue.addRequests(productVariants);
              log.debug(`Queued ${productVariants.length}x products detail variants`);
              stats.add("pages", productVariants.length);
            }

            // Getting the data from apollo state is currently the only working way
            let products = [];
            if (document.querySelector("#__APOLLO_STATE__")?.innerHTML) {
              products = handleProductUsingWindowObject(document, country);
              stats.add("JSON", products.length);
            } else if (document.querySelector('a[href="#variants"]')) {
              products = handleProductUsingHTML(document, request);
              stats.add("HTML", products.length);
            } else {
              log.error("Unknown product detail page");
            }
            stats.add("crawledProducts", products.length);
            await saveUniqProducts({ products, stats, processedIds });
          }
          break;
        }
        case Labels.COUNT:
          log.info("Downloading sitemap root");
          const requests = document
            .querySelectorAll("sitemap loc")
            .map(loc => {
              const url = loc.innerHTML;
              if (url.includes("detail")) {
                return {
                  url,
                  userData: {
                    label: Labels.COUNT_PRODUCT
                  }
                };
              }
            })
            .filter(Boolean);
          await crawler.requestQueue.addRequests(requests);
          break;
        case Labels.COUNT_PRODUCT:
          const urls = document.querySelectorAll("url loc").map(loc => loc.innerHTML);
          const uniqueUrls = new Set(urls);
          stats.add("items", uniqueUrls.size);
          stats.add("itemsDuplicity", urls.length - uniqueUrls.size);
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  log.info("Crawling start");
  const startingRequests = [];
  switch (type) {
    case ActorType.BlackFriday:
      startingRequests.push({
        url: country === Country.CZ ? BASE_URL_CZ_BF : BASE_URL_SK_BF,
        userData: {
          label: Labels.BF
        }
      });
      break;
    case ActorType.Test:
      startingRequests.push({
        url: "https://www.notino.cz/kosmetika/pletova-kosmetika/pletove-kremy/",
        userData: { label: Labels.CATEGORY_PAGE }
      });
      break;
    case ActorType.Count:
      startingRequests.push({
        url: country === Country.CZ ? SITEMAP_URL_CZ : SITEMAP_URL_SK,
        userData: { label: Labels.COUNT }
      });
      break;
    default:
      const rootUrl = country === Country.CZ ? BASE_URL : BASE_URL_SK;
      startingRequests.push({
        url: rootUrl,
        userData: { label: Labels.HOME_PAGE }
      });
  }
  await crawler.run(testUrls ?? startingRequests);

  log.info("Crawling finished.");

  const tableName = `notino${
    country === Country.CZ ? "" : `_${country.toLowerCase()}`
  }${type === ActorType.BlackFriday ? "_bf" : ""}`;

  await stats.save(true);

  if (!development && type !== ActorType.Count) {
    await uploadToKeboola(tableName);
  }

  log.info("Finished.");
}

await Actor.main(main);
