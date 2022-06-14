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

async function scrapeTopCategories({ document, requestQueue, input }) {
  const links = document.querySelectorAll(
    `[data-testid="product-category"] h2 a`
  );
  for (let link of links) {
    const href = link.getAttribute("href");
    await requestQueue.addRequest({
      url: completeUrl(input.country, href),
      userData: {
        label: LABELS.SUB_CATEGORIES,
        crumbs: [],
      }
    });
  }
}

async function scrapeSubCategories({
  document,
  requestQueue,
  input,
  request,
}) {
  const links = document.querySelectorAll(
    `[data-testid="categories-rondell-card"] a`
  );
  const { innerText: categoryTitle } = document.querySelector(
    `[data-testid="category-page-header"] h1`
  );

  if (links.length) {
    for (let link of links) {
      const crumb = {
        url: completeUrl(input.country, link.getAttribute("href")),
        title: link.getAttribute("title"),
      };

      await requestQueue.addRequest({
        url: crumb.url,
        userData: {
          label: LABELS.SUB_CATEGORIES,
          crumbs: [...request.userData.crumbs, crumb],
        }
      });
    }
  } else {
    const fromSubToTopCategories = request.userData.crumbs.reverse();

    for (let category of fromSubToTopCategories) {
      await requestQueue.addRequest({
        uniqueKey: `products in ${category.title}`,
        url: category.url,
        userData: {
          label: LABELS.CAT_PRODUCTS,
          category,
        }
      });
    }
  }
}

async function scrapeCatProducts({
  document,
  requestQueue,
  input,
  request,
}) {
  console.warn(`TODO scrape products in ${request.userData.category.title} at ${request.userData.category.url}`);
}

main(async () => {
  const input = Object.assign({}, (await getInput()), {
    type: ActorType.FULL,
    country: COUNTRY.CZ,
  });

  const requestQueue = await openRequestQueue();

  await requestQueue.addRequest({
    url: completeUrl(input.country, "/c/"),
    userData: {
      label: LABELS.TOP_CATEGORIES,
    },
  });

  const crawler = new BasicCrawler({
    requestQueue,
    async handleRequestFunction({ request }) {
      const resp = await fetch(request.url);
      const body = await resp.text();
      const { document } = parseHTML(body);

      switch (request.userData.label) {

        case LABELS.TOP_CATEGORIES:
          await scrapeTopCategories({ document, requestQueue, input });
          break;

        case LABELS.SUB_CATEGORIES:
          await scrapeSubCategories({ document, requestQueue, input, request });
          break;

        case LABELS.CAT_PRODUCTS:
          await scrapeCatProducts({ document, requestQueue, input, request });
          break;
      }

      // await pushData({
      //   noop: 1
      // });
    }
  });

  await crawler.run();
});
