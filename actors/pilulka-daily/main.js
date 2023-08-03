import { Actor, log, LogLevel } from "apify";
import { HttpCrawler, useState, createHttpRouter } from "@crawlee/http";
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

/** @typedef {import("@crawlee/http").HttpCrawlingContext} HttpCrawlingContext */

/** @enum {string} */
export const Labels = {
  START: "START",
  SUB_CATEGORY: "SUB_CATEGORY",
  CATEGORY: "CATEGORY",
  CATEGORY_PAGE: "CATEGORY_PAGE",
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

/**
 * Pilulka has one root sitemap with linked sub-sitemaps in it.
 * We are looking for sub-sitemaps of product pages.
 */
function handleSitemap() {
  /** @param {HttpCrawlingContext} context */
  return async function ({ body, enqueueLinks, log, response }) {
    log.info("Reading Sitemap", { url: response.url });
    const { document } = parseXML(body.toString());
    const urls = Array.from(document.querySelectorAll("loc"))
      .map(el => el.textContent)
      .filter(url => url.includes("/sitemaps/products-"));
    log.info(`Found ${urls.length} products sitemaps`);
    await enqueueLinks({ urls, label: Labels.PRODUCTS_SITEMAP });
  };
}

function handleProductsSitemap() {
  /** @param {HttpCrawlingContext} context */
  return async function ({ body, enqueueLinks, log, response }) {
    log.info("Reading Sitemap", { url: response.url });
    const { document } = parseXML(body.toString());
    const urls = Array.from(document.querySelectorAll("loc")).map(
      el => el.textContent
    );
    log.info(`Found ${urls.length} products`, { url: response.url });
    await enqueueLinks({ urls, label: Labels.PRODUCT_DETAIL });
  };
}

function handleProductDetail({ processedIds, stats }) {
  /** @param {HttpCrawlingContext} context */
  return async function ({ body, log, response }) {
    stats.inc("items");
    const itemUrl = response.url;
    log.debug("Extracting product data", { url: itemUrl });
    const { document } = parseHTML(body.toString());
    const data = JSON.parse(
      document.querySelector("script[type='application/ld+json']")
        ?.textContent ?? "{}"
    );
    const product = data?.find(x => x["@type"] === "Product");
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
  };
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
      [Labels.PRODUCT_DETAIL]: handleProductDetail({ processedIds, stats })
      // TODO: [Labels.CATEGORY] for BlackFriday scraping
    }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const requests =
    urls?.map(url => {
      if (typeof url === "string" && type === ActorType.BlackFriday) {
        return {
          url,
          label: Labels.CATEGORY
        };
      } else if (typeof url === "string") {
        return {
          url,
          userData: { label: Labels.START }
        };
      }
      return url;
    }) ?? sitemapUrl(country);
  await crawler.run(requests);

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
