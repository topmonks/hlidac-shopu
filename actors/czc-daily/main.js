import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { parseHTML } from "linkedom/cached";

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
  const extract = element => ({
    itemUrl: createUrl(element.querySelector(".tile-title a").href),
    itemId: element
      .querySelector("[data-product-code]")
      .getAttribute("data-product-code"),
    itemName: element.querySelector(".tile-title a")?.textContent?.trim(),
    inStock:
      element
        .querySelector(".btn.btn-buy")
        ?.classList?.has("item-not-on-stock") == false,
    currentPrice: cleanPrice(
      element.querySelector(".total-price .price .price-vatin")?.textContent
    ),
    originalPrice: cleanPrice(
      element.querySelector(".total-price .price-before .price-vatin")
        ?.textContent
    ),
    get discounted() {
      return this.currentPrice < this.originalPrice;
    },
    img: element.querySelector(".img-wrapper img")?.src,
    category,
    paginationUrl
  });

  return Array.from(document.querySelectorAll("#tiles .new-tile")).map(extract);
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
async function handleCategory(
  body,
  log,
  session,
  stats,
  createUrl,
  requestQueue,
  enqueueLinks
) {
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

  for (let product of products) {
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

function getTableName(type) {
  const postfix = getPostfix(type);
  return `czc${postfix}`;
}

export async function main() {
  const rollbar = Rollbar.init();
  const input = (await KeyValueStore.getInput()) ?? {};

  const {
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.BlackFriday,
    urls = []
  } = input;

  const requestQueue = await Actor.openRequestQueue();
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    duplicates: 0,
    pages: 0,
    items: 0,
    denied: 0,
    ok: 0,
    errors: 0
  });

  switch (type) {
    case ActorType.BlackFriday: {
      if (urls.length === 0) {
        await requestQueue.addRequest({
          url: `https://czc.cz/black-friday/produkty`,
          userData: { label: Label.Category }
        });
      }
      break;
    }
    default:
      if (urls.length === 0) {
        log.info("No URLs provided");
      }
  }

  const crawler = new HttpCrawler({
    requestQueue,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      persistStateKeyValueStoreId: "czc-sessions"
    },
    proxyConfiguration,
    maxConcurrency,
    async requestHandler({
      request,
      response,
      body,
      session,
      log,
      enqueueLinks
    }) {
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

      switch (label) {
        case Label.Category:
          return handleCategory(
            body,
            log,
            session,
            stats,
            createUrl,
            requestQueue,
            enqueueLinks
          );
        default:
          throw new Error(`Page type "${label}" not yet implemented`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} ${error.message} failed 4 times`);
    }
  });

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
