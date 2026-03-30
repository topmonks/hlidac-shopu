import { HttpCrawler, createHttpRouter, useState } from "@crawlee/http";
import { Sitemap } from "@crawlee/utils";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { parseFloatText, saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { cleanPriceText } from "@hlidac-shopu/lib/parse.mjs";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

/** @enum {string} */
export const Labels = {
  CATEGORY: "category",
  PRODUCT_DETAIL: "productDetail",
  INITIAL_CATEGORIES: "initialCategories"
};

/** @enum {string} */
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

export const rootCZ = "https://www.pilulka.cz";
export const rootSK = "https://www.pilulka.sk";

export const rootWebUrl = country => (country === Country.CZ ? rootCZ : rootSK);

export function buildUrl(domain, link) {
  if (!link) return null;
  return new URL(link, domain).href;
}

function blackFridayUrl(country) {
  return [
    {
      url: buildUrl(rootWebUrl(country), country === Country.CZ ? "/akce-a-slevy" : "/akcie-a-zlavy"),
      label: Labels.CATEGORY
    }
  ];
}

function initialCategoriesUrl(country) {
  return [
    {
      url: buildUrl(rootWebUrl(country), "/"),
      label: Labels.INITIAL_CATEGORIES
    }
  ];
}

function toArray(o) {
  if (Array.isArray(o)) return o;
  return [o];
}

/**
 * @param {Country} country
 * @param {ActorType} type
 * @param {Array<RequestOptions|string>} urls
 * @return {RequestOptions[]}
 */
function initialRequests(country, type, urls) {
  if (urls?.length) {
    return urls.map(url => {
      if (typeof url === "string" && type === ActorType.BlackFriday) {
        return { url, label: Labels.CATEGORY };
      } else if (typeof url === "string") {
        return { url, label: Labels.PRODUCT_DETAIL };
      }
      return url;
    });
  }
  if (type === ActorType.BlackFriday) {
    return blackFridayUrl(country);
  }
  return initialCategoriesUrl(country);
}

/**
 * Extracts plain text content from HTML string.
 * Removes all HTML tags and returns trimmed text content.
 * HTML entities are automatically decoded by the DOM parser.
 *
 * @param {string|null|undefined} textWithHTML - HTML string to extract text from
 * @returns {string|null} Extracted and trimmed text content, or null if input is falsy or empty
 */
function extractTextFromHtml(textWithHTML) {
  if (!textWithHTML) return null;
  const { document } = parseHTML(`<div>${textWithHTML}</div>`);
  return document.querySelector('*')?.textContent?.trim() || null;
}

function defRouter(processedIds, stats) {
  return createHttpRouter({
    /** @param {HttpCrawlingContext} context */
    async initialCategories({ body, enqueueLinks, log, response }) {
      const { document } = parseHTML(body.toString());
      const linkElements = document.querySelectorAll(`.menu__href`);
      log.info(
        `Found categories: ${Array.from(linkElements)
          .map(link => link.textContent)
          .join(", ")}`
      );
      const links = Array.from(linkElements).map(link => buildUrl(response.url, link.href));
      await enqueueLinks({ urls: links, label: Labels.CATEGORY });
    },
    /** @param {HttpCrawlingContext} context */
    async productDetail({ body, log, response }) {
      stats.inc("items");
      const itemUrl = response.url;
      log.debug("Extracting product data", { url: itemUrl });
      const { document } = parseHTML(body.toString());
      const data = toArray(
        JSON.parse(document.querySelector("script[type='application/ld+json']")?.textContent ?? "[]")
      );
      const product = data.find(x => x["@type"] === "Product");
      const title = product?.name;

      const productPrice  = product?.offers?.price
      let currentPrice;
      let originalPrice;
      let isDiscounted = false;

      if (productPrice == null || Number.isNaN(productPrice) || productPrice < 0) {
        stats.inc("itemNoPrice");
        log.warning("Item has no price. Skipping...", { url: itemUrl });
        return;
      }

      const inStock = product?.offers?.availability === "https://schema.org/InStock";
      const imageUrl = product?.image?.[0];

      const shortDesc = extractTextFromHtml(product?.description);

      const { id: itemId } = document.querySelector("[componentname='catalog.product']");
      const oldPrice = parseFloatText(
        cleanPriceText(document.querySelector(`.product-price-container .product-card-price__old`)?.textContent ?? "")
      );

      const giftElement = document.querySelector(`.giftEvents__item`);
      const giftPriceElement = document.querySelector(`.giftEvents__price__price`);

      const hasCouponPrice = Boolean(giftPriceElement)
        && !/pro\s+členy\s+Pilulka/i.test(giftElement.textContent);

      const hasDiscount = !Number.isNaN(oldPrice) && oldPrice > 0;

      if (!!giftPriceElement && !hasCouponPrice) {
        log.warning("Product has discount price only for club members", { url: itemUrl });
      }

      if (hasCouponPrice) {
        currentPrice = parseFloatText(
          cleanPriceText(giftPriceElement?.textContent ?? "")
        );
        originalPrice = oldPrice ?? productPrice;
        isDiscounted = true;
        log.info("Product has discount", { url: itemUrl });
      } else if (hasDiscount) {
        const priceWithCode = parseFloatText(
          cleanPriceText(document.querySelector(`.price-with-code__price`)?.textContent ?? "")
        );

        currentPrice = priceWithCode ?? productPrice;
        originalPrice = oldPrice ?? null;
        isDiscounted = true;
      } else {
        currentPrice = productPrice
        originalPrice = null;
      }

      const breadcrumbs = product?.category?.split(" / ").join(" > "); // "Foo / Bar / Baz" -> "Foo > Bar > Baz"

      await saveUniqProducts({
        products: [
          {
            itemId,
            itemUrl,
            itemName: title,
            shop: shopName(itemUrl),
            slug: itemSlug(itemUrl),
            img: imageUrl,
            shortDesc,
            inStock,
            category: breadcrumbs,
            originalPrice,
            currentPrice,
            discounted: isDiscounted
          }
        ],
        stats,
        processedIds
      });
    },
    /** @param {HttpCrawlingContext} context */
    async category({ body, enqueueLinks, log, response }) {
      const categoryUrl = response.url;
      log.debug("Extracting category", { url: categoryUrl });
      const { document } = parseHTML(body.toString());

      const detailLinks = document.querySelectorAll(`.product-list .product__name`);
      const urls = Array.from(detailLinks).map(x => buildUrl(categoryUrl, x.href));
      if (urls.length) await enqueueLinks({ urls, label: Labels.PRODUCT_DETAIL });

      const nextPageUrl = document.querySelector(`.page-item--next a`)?.href;
      if (!nextPageUrl) return;
      await enqueueLinks({
        urls: [buildUrl(categoryUrl, nextPageUrl)],
        label: Labels.CATEGORY
      });
    }
  });
}

async function main() {
  Rollbar.init();

  const {
    development,
    debug,
    proxyGroups,
    country = Country.CZ,
    maxRequestRetries = 4,
    type = ActorType.Full,
    urls
  } = await getInput({ urls: null });

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const processedIds = await useState("processedIds");
  const stats = await withPersistedStats({
    items: 0,
    itemNoPrice: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const sitemap = await Sitemap.load([
    "https://www.pilulka.cz/sitemaps/products-0.xml",
    "https://www.pilulka.cz/sitemaps/products-1.xml"
  ]);

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 300,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries,
    requestHandler: defRouter(processedIds, stats),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  // Czech republic has all products in sitemap
  if (country === Country.CZ) {
    await crawler.run(sitemap.urls.map(url => ({ url, label: Labels.PRODUCT_DETAIL })));
  } else {
    // Slovakia does not
    await crawler.run(initialRequests(country, type, urls));
  }

  let tableName = country === Country.CZ ? "pilulka_cz" : "pilulka_sk";
  if (type === ActorType.BlackFriday) {
    tableName = `${tableName}_bf`;
  }

  await uploadToKeboola(tableName);
  log.info("upload to Keboola finished");
}

await Actor.main(main, { statusMessage: "Finished." });
