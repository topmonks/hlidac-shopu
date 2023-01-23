import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset, log } from "apify";
import { parseHTML } from "linkedom/cached";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

export const Label = {
  Category: "CATEGORY",
  Detail: "DETAIL",
  Pagination: "PAGINATION"
};

export const PRODUCTS_PER_PAGE = 27;

/**
 * @param {Document} document
 * @return {{pages: number, category: string[], productsCount: number, currentPage: number} | undefined}
 */
function extractPaginationInfo(document) {
  const category =
    document
      .querySelector("#breadcrumbs")
      ?.textContent.trim()
      .replaceAll(/\n(\s)\1+/g, "")
      .split("\n") || [];

  const pages =
    parseInt(
      document.querySelector(".paging__item.last")?.textContent.trim(),
      10
    ) || 1;

  const currentPage =
    parseInt(
      document.querySelector(".paging__item.active")?.textContent.trim(),
      10
    ) || 1;

  const productsCount =
    cleanPrice(
      document
        .querySelector("[role=navigation] .order-by-sum")
        ?.textContent.trim()
    ) || 0;

  return { category, pages, productsCount, currentPage };
}

/**
 * @param {Document} document
 * @param {{ category: string[], paginationUrl: string }} pagination
 * @param {(uri: string) => string} createUrl
 * @returns {* | null}
 */
function extractCategoryProducts(
  document,
  { category, paginationUrl },
  createUrl
) {
  return document.querySelectorAll("#tiles .new-tile").map(el => ({
    itemUrl: createUrl(el.querySelector(".tile-title a").href),
    itemId: el
      .querySelector("[data-product-code]")
      .getAttribute("data-product-code"),
    itemName: el.querySelector(".tile-title a")?.textContent?.trim(),
    inStock:
      el.querySelector(".btn.btn-buy")?.classList?.has("item-not-on-stock") ==
      false,
    currentPrice: cleanPrice(
      el.querySelector(".total-price .price .price-vatin")?.textContent
    ),
    originalPrice: cleanPrice(
      el.querySelector(".total-price .price-before .price-vatin")?.textContent
    ),
    get discounted() {
      return this.currentPrice < this.originalPrice;
    },
    img: el.querySelector(".img-wrapper img")?.src,
    category,
    paginationUrl
  }));
}

/**
 * @param {Document} document
 * @param {(uri: string) => string} createUrl
 * @returns {string[]} urls
 */
function extractCategorySubcategories(document, createUrl) {
  return Array.from(document.querySelectorAll(".scards a.scard")).map(link =>
    createUrl(link.href)
  );
}

async function handleCategory(body, log, stats, createUrl, requestQueue) {
  const html = body.toString();
  const { document } = parseHTML(html);

  const pagination = extractPaginationInfo(document);
  const { category, pages, currentPage, productsCount } = pagination;
  log.info("Category pagination info", {
    category,
    pages,
    currentPage,
    productsCount
  });

  if (currentPage === 1) {
    stats.inc("categories");
    for (let page = 2; page <= pages; page++) {
      const url = createUrl(`?q-first=${(page - 1) * PRODUCTS_PER_PAGE}`);
      await requestQueue.addRequest({
        url,
        userData: { label: Label.Category }
      });
    }
  } else {
    stats.inc("pages");
  }

  const products = extractCategoryProducts(document, pagination, createUrl);
  log.info(`Extracted ${products.length} products`);

  for (const product of products) {
    await Dataset.pushData(product);
    stats.inc("items");

    const { items } = stats.get();
    if (items === productsCount) {
      log.info("Collected all products");
    } else if (items > productsCount) {
      log.warning("Probably collecting duplicate products now");
    }
  }

  // if (currentPage === 1) {
  //   const subcategories = extractCategorySubcategories(document, createUrl);
  //   log.info(`Found ${subcategories.length} subcategories`);

  //   await enqueueLinks({
  //     label: Label.Category,
  //     urls: subcategories
  //   });
  // }
}

/**
 * @param {ActorType} type
 */
function getPostfix(type) {
  switch (type) {
    case ActorType.BlackFriday:
      return "_bf";
    case ActorType.Feed:
      return "";
    default:
      return "";
  }
}

/**
 * @param {string} type
 */
function getTableName(type) {
  const postfix = getPostfix(type);
  return `czc${postfix}`;
}

export async function main() {
  const rollbar = Rollbar.init();

  const {
    development,
    proxyGroups,
    type = ActorType.BlackFriday,
    urls = []
  } = await getInput();

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    denied: 0,
    ok: 0,
    failed: 0
  });

  const crawler = new HttpCrawler({
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      persistStateKeyValueStoreId: "czc-sessions"
    },
    proxyConfiguration,
    maxRequestsPerMinute: 600,
    async requestHandler({ request, response, body, session, log }) {
      const { label } = request.userData;

      log.info(`Visiting: ${request.url}, ${label}`);
      if (response.statusCode === 403) {
        stats.inc("denied");
        session.isBlocked();
        throw new Error("Access Denied");
      }
      if (response.statusCode === 200) stats.inc("ok");
      session.setCookiesFromResponse(response);

      const createUrl = s => new URL(s, request.url).href;

      if (label === Label.Category) {
        return handleCategory(
          body,
          log,
          stats,
          createUrl,
          crawler.requestQueue
        );
      }
      throw new Error(`Page type "${label}" not yet implemented`);
    },
    async failedRequestHandler({ request, log }, error) {
      rollbar.error(error, request);
      log.error(
        `Request ${request.url} ${error.message} failed multiple times`
      );
      stats.inc("failed");
    }
  });

  if (urls.length === 0) {
    if (type === ActorType.BlackFriday) {
      urls.push(`https://czc.cz/black-friday/produkty`);
    } else {
      log.info("No URLs provided");
    }
  }
  await crawler.addRequests(
    urls.map(url => ({ url, userData: { label: Label.Category } }))
  );
  await crawler.run();
  await stats.save(true);

  try {
    const tableName = getTableName(type);
    await uploadToKeboola(tableName);
  } catch (err) {
    log.error(err);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
