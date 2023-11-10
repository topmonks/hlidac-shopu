import { Actor, log, LogLevel } from "apify";
import { createHttpRouter, HttpCrawler, useState } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  parseFloatText,
  saveUniqProducts
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { cleanPriceText } from "@hlidac-shopu/lib/parse.mjs";

/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

/** @enum {string} */
export const Labels = {
  CATEGORY: "CATEGORY",
  SITEMAP: "SITEMAP",
  PRODUCTS_SITEMAP: "PRODUCTS_SITEMAP",
  PRODUCT_DETAIL: "PRODUCT_DETAIL"
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

function sitemapUrl(country) {
  return [
    {
      url: buildUrl(rootWebUrl(country), "/sitemap.xml"),
      label: Labels.SITEMAP
    }
  ];
}
function blackFridayUrl(country) {
  return [
    {
      url: buildUrl(rootWebUrl(country), "/black-friday"),
      label: Labels.CATEGORY
    }
  ];
}

/**
 * Pilulka has one root sitemap with linked sub-sitemaps in it.
 * We are looking for sub-sitemaps of product pages.
 */
function handleSitemap() {
  /** @param {HttpCrawlingContext} context */
  async function handler({ body, enqueueLinks, log, response }) {
    log.info("Reading Sitemap", { url: response.url });
    const { document } = parseXML(body.toString());
    const urls = Array.from(document.querySelectorAll("loc"))
      .map(el => el.textContent)
      .filter(url => url.includes("/sitemaps/products-"));
    log.info(`Found ${urls.length} products sitemaps`);
    await enqueueLinks({ urls, label: Labels.PRODUCTS_SITEMAP });
  }
  return handler;
}

function handleProductsSitemap() {
  /** @param {HttpCrawlingContext} context */
  async function handler({ body, enqueueLinks, log, response }) {
    log.info("Reading Sitemap", { url: response.url });
    const { document } = parseXML(body.toString());
    const urls = Array.from(document.querySelectorAll("loc")).map(
      el => el.textContent
    );
    log.info(`Found ${urls.length} products`, { url: response.url });
    await enqueueLinks({ urls, label: Labels.PRODUCT_DETAIL });
  }
  return handler;
}

function toArray(o) {
  if (Array.isArray(o)) return o;
  return [o];
}

function handleProductDetail({ processedIds, stats }) {
  /** @param {HttpCrawlingContext} context */
  async function handler({ body, log, response }) {
    stats.inc("items");
    const itemUrl = response.url;
    log.debug("Extracting product data", { url: itemUrl });
    const { document } = parseHTML(body.toString());
    const data = toArray(
      JSON.parse(
        document.querySelector("script[type='application/ld+json']")
          ?.textContent ?? "[]"
      )
    );
    const product = data.find(x => x["@type"] === "Product");
    const title = product?.name;
    const currentPrice = product?.offers?.price;

    if (
      currentPrice == null ||
      Number.isNaN(currentPrice) ||
      currentPrice < 0
    ) {
      stats.inc("itemNoPrice");
      log.warning("Item has no price. Skipping...", { url: itemUrl });
      return;
    }

    const inStock =
      product?.offers?.availability === "https://schema.org/InStock";
    const imageUrl = product?.image?.[0];
    const shortDesc = product?.description;

    const { id: itemId } = document.querySelector(
      "[componentname='catalog.product']"
    );
    const originalPrice = parseFloatText(
      cleanPriceText(
        document.querySelector(`.price-before, .superPrice__old__price`)
          ?.textContent ?? ""
      )
    );
    const isDiscounted = !Number.isNaN(originalPrice) && originalPrice > 0;
    const breadcrumbs = data
      .find(x => x["@type"] === "BreadcrumbList")
      .itemListElement.map(x => x.item.name)
      .join(" > ");

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
          originalPrice: isDiscounted ? originalPrice : null,
          currentPrice,
          discounted: isDiscounted
        }
      ],
      stats,
      processedIds
    });
  }
  return handler;
}

function handleCategory() {
  /** @param {HttpCrawlingContext} context */
  async function handler({ body, enqueueLinks, log, response }) {
    const categoryUrl = response.url;
    log.debug("Extracting category", { url: categoryUrl });
    const { document } = parseHTML(body.toString());

    const detailLinks = document.querySelectorAll(
      `.product-list .product-list__item .product__detail-btn`
    );
    const urls = Array.from(detailLinks).map(x =>
      buildUrl(categoryUrl, x.href)
    );
    if (urls.length) await enqueueLinks({ urls, label: Labels.PRODUCT_DETAIL });

    const nextPageUrl = document.querySelector(`.page-item--next a`)?.href;
    if (!nextPageUrl) return;
    await enqueueLinks({
      urls: [buildUrl(categoryUrl, nextPageUrl)],
      label: Labels.CATEGORY
    });
  }
  return handler;
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
  return sitemapUrl(country);
}

async function main() {
  rollbar.init();

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
  const stats = await withPersistedStats(x => x, {
    items: 0,
    itemNoPrice: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 300,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestRetries,
    requestHandler: createHttpRouter({
      [Labels.SITEMAP]: handleSitemap(),
      [Labels.PRODUCTS_SITEMAP]: handleProductsSitemap(),
      [Labels.PRODUCT_DETAIL]: handleProductDetail({ processedIds, stats }),
      [Labels.CATEGORY]: handleCategory()
    }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });
  await crawler.run(initialRequests(country, type, urls));

  if (!development) {
    let tableName = country === Country.CZ ? "pilulka_cz" : "pilulka_sk";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }

    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main, { statusMessage: "Finished." });
