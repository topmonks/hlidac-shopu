/**
 * Scrape categories and products from Hronbach HORNBACH
 */

import { fetch } from "@adobe/helix-fetch";
import Apify from "apify";
import { parseHTML } from "linkedom";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  currencyToISO4217
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
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

    log.debug(`Queued top lvl categpry "${link.getAttribute("title")}"`);
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
        url: completeUrl(input.country, link.getAttribute("href")),
        title: link.getAttribute("title")
      };

      await requestQueue.addRequest({
        url: crumb.url,
        userData: {
          label: LABELS.SUB_CATEGORIES,
          crumbs: [...request.userData.crumbs, crumb]
        }
      });

      stats.inc("categories");
      log.debug(`Scraped categpry "${crumb.title}"`);
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
        url: category.url,
        userData: {
          label: LABELS.CAT_PRODUCTS,
          category
        }
      });
      log.debug(`Queued products of very bottom category "${category.title}"`);
    }
  }
}

function parseCategoryProductsCount(str) {
  const [countStr] = str.match(/\d+/g);
  return Number(countStr);
}

async function scrapeCatProducts({
  dom: { document, window },
  requestQueue,
  input,
  request,
  stats,
  processedIds,
  detailUrl
}) {
  const [totalCount, variantsCount] = Array.from(
    document.querySelectorAll(`[data-testid="result-count"] span`)
  )
    .map(node => node.textContent)
    .map(parseCategoryProductsCount);

  stats.add("items", totalCount);
  if (variantsCount) {
    stats.add("variants", variantsCount);
  }

  const products = document.querySelectorAll(`[data-testid="article-card"]`);

  for (const item of products) {
    if (
      input.type === ActorType.TEST &&
      Array.from(products).indexOf(item) > 2
    ) {
      continue;
    }

    if (processedIds.has(item.id)) {
      stats.inc("itemsDuplicity");
      continue;
    }

    processedIds.add(item.gtin);
    stats.inc("itemsUnique");

    const href = item.querySelector("a").getAttribute("href");
    const detail = {
      itemUrl: completeUrl(input.country, href),
      itemId: href.split("/").filter(Boolean).reverse()[0]
      // TODO moooore
    };

    log.debug("Got product detail", detail);

    if (!detailUrl.deref()) {
      detailUrl.reset(detail.itemUrl);
    }
  }
}

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0,
    variants: 0
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

  if (input.type === ActorType.TEST) {
    log.debug("Running in TEST mode");
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
          await scrapeTopCategories(scraperArguments);
          break;

        case LABELS.SUB_CATEGORIES: // 2.
          await scrapeSubCategories(scraperArguments);
          break;

        case LABELS.CAT_PRODUCTS: // 3.
          await scrapeCatProducts(scraperArguments);
          break;
      }

      stats.log();
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.all([
    stats.save(),
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(detailUrl.deref())),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);

  log.info("invalidated Data CDN");
  log.info("Finished.");
});
