import { Dataset, HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { comp, map, push, transduce } from "@thi.ng/transducers";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("@hlidac-shopu/actors-common").Product} Product */
/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */

const PROCESSED_IDS_KEY = "processedIds";

const currencyByCountry = new Map([
  ["CZ", "CZK"],
  ["SK", "EUR"]
]);

/**
 *
 * @param result
 * @param {Object} params
 * @param {string} params.url
 * @param {number} params.originalPrice
 * @param {string} params.country
 * @returns {Product}
 */
function toProduct(result, { url, originalPrice, country }) {
  const slug = result.url;
  const itemId = result.id;
  const itemUrl = new URL(result.url, url).href;
  const itemName = result.name;
  const img = result.photoFile;
  const currentPrice = result.unitPriceWithVat;
  const discounted = Boolean(originalPrice) && currentPrice !== originalPrice;
  const inStock = true;
  const category = result.mainCategory;
  const currency = currencyByCountry.get(country);
  return {
    slug,
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
 * @param {number} page
 * @param {Object} userData
 * @returns {RequestOptions[]}
 */
function categoryPageRequest(page, userData) {
  return [
    {
      url: "https://www.4camping.cz/api/parametric-search/",
      method: "POST",
      payload: JSON.stringify({
        typeClassname: "ParametricSearch\\Type\\Category",
        options: { categoryId: userData.categoryId, additionalCategoryIds: [] },
        sort: null,
        page,
        conditions: {},
        baseConditions: {},
        existingFilters: {},
        lang: "cs",
        currency: "czk"
      }),
      label: "categoryPage",
      userData,
      useExtendedUniqueKey: true
    }
  ];
}

function defRouter({ stats, processedIds }) {
  return createHttpRouter({
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async start({ request, body, crawler }) {
      const { document } = parseXML(body.toString());
      const urls = transduce(
        comp(
          map(x => x.textContent.trim()),
          map(url => ({ url, label: "category", userData: request.userData }))
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
    async category({ request, body, crawler }) {
      stats.inc("categories");

      const { document } = parseHTML(body.toString());
      const [, categoryId] = Array.from(document.body.classList)
        .find(x => x.startsWith("current-cat-id-"))
        .split("current-cat-id-");
      const page = 1;
      await crawler.addRequests(
        categoryPageRequest(page, Object.assign({}, request.userData, { categoryId: Number.parseInt(categoryId) }))
      );
    },
    /**
     * @param {HttpCrawlingContext} ctx
     * @returns {Promise<void>}
     */
    async categoryPage({ request, json, crawler }) {
      const { url, userData } = request;
      const { country } = userData;
      const { currentPage, lastPage, items } = json;
      const { document } = parseHTML(items);
      const products = Array.from(document.querySelectorAll(".item[data-product]"), x => ({
        product: JSON.parse(x.dataset.product),
        originalPrice: cleanPrice(x.querySelector(".price .discount del")?.textContent)
      }));

      const batch = [];
      for (const { product, originalPrice } of products) {
        if (processedIds.has(product.id)) {
          stats.inc("duplicates");
          continue;
        }
        batch.push(toProduct(product, { url, originalPrice, country }));
        processedIds.add(product.id);
        stats.inc("products");
      }
      await Dataset.pushData(batch);

      if (currentPage < lastPage) {
        await crawler.addRequests(categoryPageRequest(currentPage + 1, request.userData));
      }
    }
  });
}

/**
 *
 * @param {Object} params
 * @param {ActorType} params.type
 * @param {string} params.country
 * @returns {Source}
 */
function getStartUrls({ type, country }) {
  return [
    {
      url: `https://www.4camping.${country.toLowerCase()}/sitemap/categories/`,
      label: "start",
      userData: { country, type }
    }
  ];
}

async function main() {
  Rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) ?? []);
  Actor.on("persistState", () => Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds)));

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
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
