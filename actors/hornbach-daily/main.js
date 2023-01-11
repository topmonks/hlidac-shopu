import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "linkedom/cached";
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

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum {string} */
const Currency = {
  CZ: "CZK",
  SK: "EUR"
};

/** @enum {string} */
const Labels = {
  TOP_CATEGORIES: "TOP_CATEGORIES",
  SUB_CATEGORIES: "SUB_CATEGORIES",
  CAT_PRODUCTS: "CAT_PRODUCTS"
};

/**
 * @param {string} country
 * @param {string} path
 */
function completeUrl(country, path) {
  return `https://www.hornbach.${country.toLowerCase()}${path}`;
}

function scrapeTopCategories({ document, input }) {
  const links = document.querySelectorAll(
    `[data-testid="product-category"] h2 a`
  );
  return links.map(link => {
    log.debug(`Queued top lvl category "${link.getAttribute("title")}"`);
    const href = link.getAttribute("href");
    return {
      url: completeUrl(input.country, href),
      userData: {
        label: Labels.SUB_CATEGORIES,
        crumbs: []
      }
    };
  });
}

function scrapeSubCategories({ document, input, request, stats }) {
  const links = document.querySelectorAll(
    `[data-testid="categories-rondell"] [data-testid="rondell-card"] a`
  );
  const requests = [];
  if (links.length) {
    for (let link of links) {
      const crumb = {
        link: completeUrl(input.country, link.getAttribute("href")),
        title: link.getAttribute("title")
      };

      requests.push({
        url: crumb.link,
        userData: {
          label: Labels.SUB_CATEGORIES,
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
      requests.push({
        uniqueKey: `products in ${category.title}`,
        url: category.link,
        userData: {
          label: Labels.CAT_PRODUCTS,
          category,
          page: 1
        }
      });
      log.debug(`Queued products of very bottom category "${category.title}"`);
    }
  }
  return requests;
}

/**
 * @param {string} str
 */
function parseCategoryProductsCount(str) {
  if (!str) return 0;
  const match = str.match(/\d+/g);
  return match ? Number(match[0]) : 0;
}

function scrapeCatProducts({ document, request }) {
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

  const requests = [];
  if (request.userData.page === 1) {
    log.debug(`Category URL is ${category.link}`);
    const pagesCount = Math.ceil(categoryProductsCount / 72);
    log.debug(`Category has ${pagesCount} pages`);

    for (let page = 2; page <= pagesCount; page++) {
      requests.push({
        uniqueKey: `products in ${category.title} on ${page}. page`,
        url: `${category.link}?page=${page}`,
        userData: {
          label: Labels.CAT_PRODUCTS,
          category,
          page
        }
      });
    }
  } else {
    log.debug(`Scraping ${request.userData.page}. Page on ${request.url}`);
  }
  return requests;
}

function extractProducts({ document, input, request, stats, detailUrl }) {
  const { category } = request.userData;
  const currency = Currency[input.country.toUpperCase()];
  const productNodes = document.querySelectorAll(
    `[data-testid="article-card"]`
  );
  return productNodes
    .map(itemNode => {
      const href = itemNode.querySelector("a").getAttribute("href");
      const itemId = href.split("/").filter(Boolean).reverse()[0];

      stats.inc("items");
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
        currency
      };

      log.debug("Got product detail", detail);

      if (!detailUrl.deref()) {
        detailUrl.reset(detail.itemUrl);
      }
      return detail;
    })
    .filter(Boolean);
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0
  });
  const detailUrl = defAtom(null);

  const input = Object.assign(
    {
      type: process.env.TYPE ?? ActorType.Full,
      country: Country.CZ,
      debug: false
    },
    await KeyValueStore.getInput()
  );

  if (input.debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  log.debug(`Running in ${input.type} mode`);

  if ([ActorType.Test, ActorType.Full].includes(input.type) === false) {
    log.error(`Actor type ${input.type} not yet implemented`);
    return;
  }

  const filterTestRequests = ({ requests, input, take = 1 }) => {
    return input.type === ActorType.Test ? requests.slice(0, take) : requests;
  };

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    async requestHandler({ request, crawler, body, log }) {
      log.info(`Processing ${request.url}...`);
      const { document } = parseHTML(body.toString());

      switch (request.userData.label) {
        case Labels.TOP_CATEGORIES: // 1.
          {
            const requests = scrapeTopCategories({ document, input });
            await crawler.requestQueue.addRequests(
              filterTestRequests({ requests, input }),
              {
                forefront: true
              }
            );
          }
          break;
        case Labels.SUB_CATEGORIES: // 2.
          {
            const requests = scrapeSubCategories({
              document,
              input,
              request,
              stats
            });
            await crawler.requestQueue.addRequests(
              filterTestRequests({ requests, input })
            );
          }
          break;
        case Labels.CAT_PRODUCTS: // 3.
          {
            const requests = scrapeCatProducts({ document, request });
            await crawler.requestQueue.addRequests(
              filterTestRequests({ requests, input })
            );
            const products = extractProducts({
              document,
              input,
              request,
              stats,
              detailUrl
            });
            await Dataset.pushData(products);
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run([
    {
      url: completeUrl(input.country, "/c/"),
      userData: {
        label: Labels.TOP_CATEGORIES
      }
    }
  ]);
  log.info("crawler finished");

  await Promise.all([
    stats.save(true),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);
  log.info("Finished.");
}

await Actor.main(main);
