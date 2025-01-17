import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPriceText, cleanUnitPriceText } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";

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

/** @enum {string} */
const Selectors = {
  TOP_CATEGORIES: '[data-testid="product-category"] h2 a',
  SUB_CATEGORIES: '[data-testid="categories-slider"] [data-testid="slider-card"] a',
  TOTAL_PRODUCTS_COUNT: '[data-testid="result-count"]',
  PRODUCT_CARD: '[data-testid="article-card"]',
  ITEM_NAME: '[data-testid="article-title"]',
  PRODUCT_IMAGE: 'picture img',
  CURRENT_PRICE: '[class*="display_price"]',
  CURRENT_UNIT_PRICE: '[class*="bracket_price"]'
};

/**
 * @param {string} country
 * @param {string} path
 */
function completeUrl(country, path) {
  return `https://www.hornbach.${country.toLowerCase()}${path}`;
}

function topCategoriesRequests({ document, input }) {
  const links = document.querySelectorAll(Selectors.TOP_CATEGORIES);
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

function subCategoriesRequests({ document, input, request, stats }) {
  const links = document.querySelectorAll(Selectors.SUB_CATEGORIES);
  return links.map(link => {
    const crumb = {
      link: completeUrl(input.country, link.getAttribute("href")),
      title: link.getAttribute("title")
    };
    stats.inc("categories");
    log.debug(`Scraped category "${crumb.title}"`);
    return {
      url: crumb.link,
      userData: {
        label: Labels.SUB_CATEGORIES,
        crumbs: [...request.userData.crumbs, crumb]
      }
    };
  });
}

function catProductsFromSubCategoriesRequests({ request }) {
  const categoriesFromBottomToTop = request.userData.crumbs.reverse();
  log.debug(`Hit rock bottom at ${categoriesFromBottomToTop.length}. level`);

  return categoriesFromBottomToTop.map(category => {
    log.debug(`Queued products of very bottom category "${category.title}"`);
    return {
      url: `${category.link}?page=1`,
      userData: {
        label: Labels.CAT_PRODUCTS,
        category,
        page: 1
      }
    };
  });
}

/**
 * @param {string} str
 */
function parseCategoryProductsCount(str) {
  if (!str) return 0;
  const match = str.match(/\d+/g);
  return match ? Number(match[0]) : 0;
}

function catProductsRequests({ document, request }) {
  const categoryProductsCountNode = document.querySelector(Selectors.TOTAL_PRODUCTS_COUNT);
  if (!categoryProductsCountNode) {
    log.error(`No products count node found in ${request.url}`);
    return;
  }
  const categoryProductsCount = parseCategoryProductsCount(categoryProductsCountNode?.textContent);

  const { category } = request.userData;

  log.debug(`Scraping ${request.userData.page}. Page on ${request.url}`);
  if (request.userData.page === 1) {
    log.debug(`Category URL is ${category.link}`);
    const pagesCount = Math.ceil(categoryProductsCount / 72);
    log.debug(`Category has ${pagesCount} pages`);

    return restPageUrls(pagesCount, page => ({
      url: `${category.link}?page=${page}`,
      userData: {
        label: Labels.CAT_PRODUCTS,
        category,
        page
      }
    }));
  } else {
    return [];
  }
}

function extractProducts({ document, input, request, stats }) {
  const { category } = request.userData;
  const currency = Currency[input.country.toUpperCase()];
  const productNodes = document.querySelectorAll(Selectors.PRODUCT_CARD);
  return productNodes
    .map(itemNode => {
      const href = itemNode.querySelector("a").getAttribute("href");
      const itemId = href.split("/").filter(Boolean).at(-1);

      stats.inc("items");
      const detail = {
        itemId,
        itemUrl: completeUrl(input.country, href),
        itemName: itemNode.querySelector(Selectors.ITEM_NAME)?.textContent,
        img: itemNode.querySelector(Selectors.PRODUCT_IMAGE).getAttribute("src"),
        currentPrice: cleanPriceText(itemNode.querySelector(Selectors.CURRENT_PRICE)?.textContent ?? ""),
        currentUnitPrice: cleanUnitPriceText(itemNode.querySelector(Selectors.CURRENT_UNIT_PRICE)?.textContent ?? ""),
        category: {
          link: category.link,
          title: category.title
        },
        currency
      };

      log.debug("Got product detail", detail);

      return detail;
    })
    .filter(Boolean);
}

function filterTestRequests({ requests, input, take = 2 }) {
  return input.type === ActorType.Test ? requests.slice(0, take) : requests;
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    failed: 0
  });

  const input = await getInput({
    type: ActorType.Full,
    country: Country.CZ
  });

  if (input.debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  log.debug(`Running in ${input.type} mode`);

  if ([ActorType.Test, ActorType.Full].includes(input.type) === false) {
    log.error(`Actor type ${input.type} not yet implemented`);
    return;
  }

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    async requestHandler({ request, crawler, body, log }) {
      const label = request.userData.label;
      log.info(`Processing ${request.url} (${label})`);
      const { document } = parseHTML(body.toString());

      switch (label) {
        case Labels.TOP_CATEGORIES:
          {
            const requests = topCategoriesRequests({ document, input });
            await crawler.requestQueue.addRequests(filterTestRequests({ requests, input }), {
              forefront: true
            });
          }
          break;
        case Labels.SUB_CATEGORIES:
          {
            const links = document.querySelectorAll(Selectors.SUB_CATEGORIES);
            if (links.length) {
              const requests = subCategoriesRequests({
                document,
                input,
                request,
                stats
              });
              await crawler.requestQueue.addRequests(filterTestRequests({ requests, input }), { forefront: true });
            } else {
              const requests = catProductsFromSubCategoriesRequests({
                request
              });
              await crawler.requestQueue.addRequests(filterTestRequests({ requests, input }));
            }
          }
          break;
        case Labels.CAT_PRODUCTS:
          {
            const requests = catProductsRequests({ document, request });
            await crawler.requestQueue.addRequests(filterTestRequests({ requests, input }));
            const products = extractProducts({
              document,
              input,
              request,
              stats
            });
            await Dataset.pushData(products);
          }
          break;
        default:
          log.warning(`Unknown label ${label}`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startUrl = completeUrl(input.country, "/c/");
  await crawler.run([
    {
      url: startUrl,
      userData: {
        label: Labels.TOP_CATEGORIES
      }
    }
  ]);
  log.info("crawler finished");

  await Promise.all([stats.save(true), uploadToKeboola(shopName(startUrl))]);
  log.info("Finished.");
}

await Actor.main(main);
