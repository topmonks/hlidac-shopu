/**
 * Scrape categories and products from Hornbach
 */

import { fetch } from "@adobe/helix-fetch";
import Apify from "apify";
import { parseHTML } from "linkedom";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import {
  cleanPriceText,
  cleanUnitPriceText
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const CURRENCY = {
  CZ: "CZK",
  SK: "EUR"
};

const LABELS = {
  TOP_CATEGORIES: "TOP_CATEGORIES",
  SUB_CATEGORIES: "SUB_CATEGORIES",
  CAT_PRODUCTS: "CAT_PRODUCTS"
};

const { log } = Apify.utils;

const completeUrl = (country, path) =>
  `https://www.hornbach.${country.toLowerCase()}${path}`;

async function scrapeTopCategories({ dom: { document }, requestQueue, input }) {
  const links = document.querySelectorAll(
    `[data-testid="product-category"] h2 a`
  );
  for (let link of links) {
    if (input.type === ActorType.TEST && links.indexOf(link) > 0) {
      continue;
    }
    const href = link.getAttribute("href");
    await requestQueue.addRequest({
      url: completeUrl(input.country, href),
      userData: {
        label: LABELS.SUB_CATEGORIES,
        crumbs: []
      }
    });

    log.debug(`Queued top lvl category "${link.getAttribute("title")}"`);
  }
}

async function scrapeSubCategories({
  dom: { document },
  requestQueue,
  input,
  request,
  stats
}) {
  const links = document.querySelectorAll(
    `[data-testid="categories-rondell-card"] a`
  );
  const { innerText: categoryTitle } = document.querySelector(
    `[data-testid="category-page-header"] h1`
  );

  if (links.length) {
    for (let link of links) {
      if (input.type === ActorType.TEST && links.indexOf(link) > 0) {
        continue;
      }
      const crumb = {
        link: completeUrl(input.country, link.getAttribute("href")),
        title: link.getAttribute("title")
      };

      await requestQueue.addRequest({
        url: crumb.link,
        userData: {
          label: LABELS.SUB_CATEGORIES,
          crumbs: [...request.userData.crumbs, crumb]
        }
      });

      stats.inc("categories");
      log.debug(`Scraped category "${crumb.title}"`);
    }
  } else {
    const categoriesFromBottomToTop = request.userData.crumbs.reverse();
    log.debug(`Hit rock bottom at ${categoriesFromBottomToTop.length}. level`);

    for (let category of categoriesFromBottomToTop) {
      if (
        input.type === ActorType.TEST &&
        categoriesFromBottomToTop.indexOf(category) > 0
      ) {
        continue;
      }
      await requestQueue.addRequest({
        uniqueKey: `products in ${category.title}`,
        url: category.link,
        userData: {
          label: LABELS.CAT_PRODUCTS,
          category,
          page: 1
        }
      });
      log.debug(`Queued products of very bottom category "${category.title}"`);
    }
  }
}

function parseCategoryProductsCount(str) {
  if (!str) return 0;
  const [countStr] = str.match(/\d+/g);
  return Number(countStr);
}

async function scrapeCatProducts({
  dom: { document },
  requestQueue,
  input,
  request,
  stats,
  processedIds,
  detailUrl
}) {
  const categoryProductsCountNode = document.querySelector(
    `[data-testid="result-count"]`
  );
  if (!categoryProductsCountNode) {
    log.error(`No products count node found in ${request.url}`);
    return;
  }
  const categoryProductsCount = parseCategoryProductsCount(
    categoryProductsCountNode?.textContent
  );

  const { category } = request.userData;

  if (request.userData.page === 1) {
    log.debug(`Category URL is ${category.link}`);
    const pagesCount = Math.ceil(categoryProductsCount / 72);
    log.debug(`Category has ${pagesCount} pages`);

    for (let page = 2; page <= pagesCount; page++) {
      await requestQueue.addRequest({
        uniqueKey: `products in ${category.title} on ${page}. page`,
        url: `${category.link}?page=${page}`,
        userData: {
          label: LABELS.CAT_PRODUCTS,
          category,
          page
        }
      });
    }
  } else {
    log.debug(`Scraping ${request.userData.page}. Page on ${request.url}`);
  }

  const productNodes = document.querySelectorAll(
    `[data-testid="article-card"]`
  );

  for (const itemNode of productNodes) {
    if (
      input.type === ActorType.TEST &&
      Array.from(productNodes).indexOf(itemNode) > 2
    ) {
      continue;
    }

    const href = itemNode.querySelector("a").getAttribute("href");
    const itemId = href.split("/").filter(Boolean).reverse()[0];

    stats.inc("items");
    if (processedIds.has(itemId)) {
      stats.inc("itemsDuplicity");
      continue;
    }
    processedIds.add(itemId);
    stats.inc("itemsUnique");

    const detail = {
      itemId,
      itemUrl: completeUrl(input.country, href),
      itemName: itemNode.querySelector(`[data-testid="article-title"]`)
        ?.textContent,
      img: itemNode.querySelector(`picture img`).getAttribute("src"),
      currentPrice: cleanPriceText(
        itemNode.querySelector(`[class*="display_price"]`)?.textContent ?? ""
      ),
      currentUnitPrice: cleanUnitPriceText(
        itemNode.querySelector(`[class*="bracket_price"]`)?.textContent ?? ""
      ),
      category: {
        link: category.link,
        title: category.title
      },
      currency: CURRENCY[input.country]
    };

    await Apify.pushData(detail);
    log.debug("Got product detail", detail);

    if (!detailUrl.deref()) {
      detailUrl.reset(detail.itemUrl);
    }
  }
}

Apify.main(async () => {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });
  const processedIds = new Set();
  const detailUrl = defAtom(null);

  const input = Object.assign(
    {
      type: ActorType.FULL,
      country: COUNTRY.CZ,
      debug: false
    },
    await Apify.getInput()
  );

  if (input.debug) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  log.debug(`Running in ${input.type} mode`);

  if ([ActorType.TEST, ActorType.FULL].includes(input.type) === false) {
    log.error(`Actor type ${input.type} not yet implemented`);
    return;
  }

  const requestQueue = await Apify.openRequestQueue();

  await requestQueue.addRequest({
    url: completeUrl(input.country, "/c/"),
    userData: {
      label: LABELS.TOP_CATEGORIES
    }
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    async handleRequestFunction({ request }) {
      const resp = await fetch(request.url);
      const body = await resp.text();
      const dom = parseHTML(body);

      const scraperArguments = {
        dom,
        requestQueue,
        input,
        request,
        stats,
        processedIds,
        detailUrl
      };

      switch (request.userData.label) {
        case LABELS.TOP_CATEGORIES: // 1.
          return scrapeTopCategories(scraperArguments);

        case LABELS.SUB_CATEGORIES: // 2.
          return scrapeSubCategories(scraperArguments);

        case LABELS.CAT_PRODUCTS: // 3.
          return scrapeCatProducts(scraperArguments);
      }
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.all([
    stats.save(),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);
  log.info("Finished.");
});
