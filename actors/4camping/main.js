import { createHttpRouter, HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice, itemSlug, shopName, shopOrigin } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { comp, filter, map, push, transduce } from "@thi.ng/transducers";
import { Actor, Dataset, log, LogLevel } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

const PROCESSED_IDS_KEY = "processedIds";

/**
 * 4camping.sk formats prices like "1.200,41 €", drop the thousands separator dots
 * @param {string | undefined} text
 * @returns {number | null}
 */
function parsePrice(text) {
  return cleanPrice(text?.replace(/\.(?=\d{3}\b)/g, ""));
}

const locales = new Map([
  ["CZ", { lang: "cs", currency: "CZK" }],
  ["SK", { lang: "sk", currency: "EUR" }]
]);

/**
 * 4camping keeps the old price box in the page even when there is no discount,
 * sometimes with a price lower than the current one
 * @param {number | null} originalPrice
 * @param {number} currentPrice
 * @returns {number | null}
 */
function discountedFrom(originalPrice, currentPrice) {
  return originalPrice > currentPrice ? originalPrice : null;
}

/**
 * Inline `var data = {...}` on the product detail page holds all variants
 * @param {Document} document
 * @returns {Object | null}
 */
function productDetailData(document) {
  const script = Array.from(document.querySelectorAll("script"), x => x.textContent).find(x =>
    x.includes("var data = ")
  );
  if (!script) return null;
  const json = script.slice(script.indexOf("var data = ") + "var data = ".length, script.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

/**
 * Variant url `/p/<product>/<variant>/` is shown on the web as `/p/<product>/#<variant>`
 * @param {string} variantUrl
 * @param {string} productUrl
 * @returns {string}
 */
function variantItemUrl(variantUrl, productUrl) {
  const variantSlug = new URL(variantUrl, productUrl).pathname.split("/").filter(Boolean).at(-1);
  const url = new URL(productUrl);
  url.hash = variantSlug;
  return url.href;
}

/**
 * @param {Object} params
 * @param {string} params.itemId
 * @param {string} params.itemUrl
 * @param {string} params.itemName
 * @param {string} params.img
 * @param {number} params.currentPrice
 * @param {number | null} params.originalPrice
 * @param {string} params.category
 * @param {string} params.country
 * @returns {Product}
 */
function toProduct({ itemId, itemUrl, itemName, img, currentPrice, originalPrice, category, country }) {
  const discounted = Boolean(originalPrice) && currentPrice !== originalPrice;
  const inStock = true;
  const { currency } = locales.get(country.toUpperCase());
  return {
    shop: shopName(itemUrl),
    shopOrigin: shopOrigin(itemUrl),
    slug: itemSlug(itemUrl),
    itemId,
    itemUrl,
    itemName,
    img,
    currentPrice,
    originalPrice,
    currency,
    category,
    discounted,
    inStock
  };
}

/**
 * Product itself and each of its variants (size, colour, ...), variants live under `#<variant>` url
 * @param {Document} document
 * @param {string} url
 * @param {string} country
 * @returns {Product[]}
 */
function productsFromDetail(document, url, country) {
  const form = document.querySelector("#formProductAddToBasket");
  if (!form) return [];
  const product = JSON.parse(form.dataset.product);
  const productUrl = new URL(product.url, url).href;
  const category = product.mainCategory;
  const products = [
    toProduct({
      itemId: product.id,
      itemUrl: productUrl,
      itemName: product.name,
      img: product.photoFile,
      currentPrice: product.unitPriceWithVat,
      originalPrice: discountedFrom(
        parsePrice(document.querySelector("#productOldPrice del")?.textContent),
        product.unitPriceWithVat
      ),
      category,
      country
    })
  ];
  const variants = Object.values(productDetailData(document)?.variantsInfo ?? {});
  for (const variant of variants) {
    products.push(
      toProduct({
        // same id as 4camping uses in its analytics for a selected variant
        itemId: `${product.id}-${variant.id}`,
        itemUrl: variantItemUrl(variant.url, productUrl),
        itemName: variant.productNameWithVariant,
        img: variant.photoFilename ?? product.photoFile,
        currentPrice: variant.price,
        originalPrice: discountedFrom(variant.priceOld, variant.price),
        category,
        country
      })
    );
  }
  return products;
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async start({ request, body, crawler }) {
      const { document } = parseXML(body.toString());
      const { userData } = request;
      const urls = transduce(
        comp(
          map(x => x.textContent.trim()),
          filter(url => new URL(url).pathname === "/sitemap/products/"),
          map(url => ({ url, label: "sitemap", userData }))
        ),
        push(),
        document.getElementsByTagNameNS("", "loc")
      );
      await crawler.addRequests(urls);
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async sitemap({ request, body, crawler }) {
      const { document } = parseXML(body.toString());
      const { userData } = request;
      const urls = transduce(
        comp(
          map(x => x.textContent.trim()),
          map(url => ({ url, label: "detail", userData }))
        ),
        push(),
        document.getElementsByTagNameNS("", "loc")
      );
      stats.add("productUrls", urls.length);
      await crawler.addRequests(urls);
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async detail({ request, body }) {
      const { url, userData } = request;
      const { document } = parseHTML(body.toString());
      const products = productsFromDetail(document, url, userData.country);
      if (!products.length) {
        stats.inc("detailsWithoutProduct");
        log.warning(`Product not found, skipping ${url}`);
        return;
      }
      stats.inc("details");

      const batch = [];
      for (const product of products) {
        if (processedIds.has(product.slug)) {
          stats.inc("duplicates");
          continue;
        }
        batch.push(product);
        processedIds.add(product.slug);
        stats.inc(product.itemId.includes("-") ? "variants" : "products");
      }
      await Dataset.pushData(batch);
    }
  });
}

/**
 *
 * @param {Object} params
 * @param {ActorType} params.type
 * @param {string} params.country
 * @returns {RequestOptions[]}
 */
function getStartUrls({ type, country }) {
  const rootUrl = `https://www.4camping.${country.toLowerCase()}`;
  return [
    {
      url: new URL("/sitemap/", rootUrl).href,
      label: "start",
      userData: { country, type, rootUrl }
    }
  ];
}

async function main() {
  Rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats({
    productUrls: 0,
    details: 0,
    detailsWithoutProduct: 0,
    products: 0,
    variants: 0,
    duplicates: 0
  });

  const {
    type = ActorType.Full,
    country = "CZ",
    debug,
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
    proxyConfiguration,
    additionalMimeTypes: ["application/json", "application/xml"],
    requestHandler: defRouter({ stats, processedIds }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(urls.length ? urls : getStartUrls({ type, country }));

  await stats.save(true);

  const tableName = `4camping_${country.toLowerCase()}${type === ActorType.BlackFriday ? "_bf" : ""}`;
  await uploadToKeboola(tableName);
}

await Actor.main(main, { statusMessage: "DONE" });
