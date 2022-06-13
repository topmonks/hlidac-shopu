/**
 * Scrape categories and products from Hronbach HORNBACH
 */

import { fetch } from "@adobe/helix-fetch";
import Apify from "apify";
import { parseHTML } from "linkedom";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const LABELS = {
  TOP_CATEGORIES: "TOP_CATEGORIES",
  SUB_CATEGORIES: "SUB_CATEGORIES",
  CAT_PRODUCTS: "CAT_PRODUCTS"
};

const {
  BasicCrawler,
  getInput,
  main,
  openRequestQueue,
  pushData,
} = Apify;

const completeUrl = (country, path) => (
  `https://www.hornbach.${country.toLowerCase()}${path}`
);

async function scrapeTopCategories({ document, requestQueue, country }) {
  const links = document.querySelectorAll(
    `[data-testid="product-category"] h2 a`
  );
  for (let link of links) {
    const href = link.getAttribute("href");
    await requestQueue.addRequest({
      url: completeUrl(country, href),
      userData: {
        label: LABELS.SUB_CATEGORIES,
      }
    });
  }
}

async function scrapeSubCategories({
  document,
  requestQueue,
  country,
  url,
  userData,
}) {
  const links = document.querySelectorAll(
    `[data-testid="categories-rondell-card"] a`
  );
  const { innerText: categoryTitle } = document.querySelector(
    `[data-testid="category-page-header"] h1`
  );

  const category = userData.category
    ? `${userData.category} > ${categoryTitle}`
    : categoryTitle;

  if (links.length) {
    for (let link of links) {
      const href = link.getAttribute("href");
      await requestQueue.addRequest({
        url: completeUrl(country, href),
        userData: {
          label: LABELS.SUB_CATEGORIES,
          category,
        }
      });
    }
  } else {
    await requestQueue.addRequest({
      uniqueKey: category,
      url,
      userData: {
        label: LABELS.CAT_PRODUCTS,
        category,
      }
    });
  }
}

async function scrapeCatProducts({
  document,
  requestQueue,
  country,
  url,
  userData,
}) {
  const { category } = userData;
  console.warn("product scraper not yet implemented", { url, category });
}

main(async () => {
  const {
    type = ActorType.FULL,
    country = COUNTRY.CZ,
  } = (await getInput()) ?? {};

  const requestQueue = await openRequestQueue();

  await requestQueue.addRequest({
    url: completeUrl(country, "/c/"),
    userData: {
      label: LABELS.TOP_CATEGORIES,
    },
  });

  const crawler = new BasicCrawler({
    requestQueue,
    async handleRequestFunction({ request }) {
      const { url, userData } = request;
      const resp = await fetch(url);
      const body = await resp.text();
      const { document } = parseHTML(body);

      switch (userData.label) {

        case LABELS.TOP_CATEGORIES:
          await scrapeTopCategories({ document, requestQueue, country });
          break;

        case LABELS.SUB_CATEGORIES:
          await scrapeSubCategories({ document, requestQueue, country, url, userData });
          break;

        case LABELS.CAT_PRODUCTS:
          await scrapeCatProducts({ document, requestQueue, country, url, userData });
          break;
      }

      // await pushData({
      //   noop: 1
      // });
    }
  });

  await crawler.run();
});
