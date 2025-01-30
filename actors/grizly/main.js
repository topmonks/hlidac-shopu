import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset, log, LogLevel } from "apify";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";

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
  MAIN: "MAIN",
  CATEGORY: "CATEGORY"
};

/** @enum {string} */
const Selectors = {
  CATEGORIES_LINKS: '.sub-menu--3 li a',
  TOTAL_PRODUCTS_COUNT: '#itemscount',
  NEXT_PAGE_BUTTON: '.pager-wrap .next'
};

/**
 * @param {string} country
 * @param {string} path
 */
function completeUrl(country, path='') {
  return `https://www.grizly.${country.toLowerCase()}${path}`;
}

function categoriesRequests({ document, country }) {
  const links = document.querySelectorAll(Selectors.CATEGORIES_LINKS);
  return links.map(link => {
    log.debug(`Queued category "${link.innerText.trim()}"`);
    const href = link.getAttribute("href");
    return {
      url: completeUrl(country, href),
      label: Labels.CATEGORIES,
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

function extractProducts({ document, stats, country, request }) {
  const categoryProductsCountNode = document.querySelector(Selectors.TOTAL_PRODUCTS_COUNT).getAttribute('value');
  if (!categoryProductsCountNode) {
    log.error(`No products count node found in ${request.url}`);
    return;
  }

  const nwxtPageButton =

  console.log(categoryProductsCountNode)


}

function filterTestRequests({ requests, type, take = 2 }) {
  return type === ActorType.Test ? requests.slice(0, take) : requests;
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    failed: 0
  });

  const { type = ActorType.Full, country = Country.CZ, debug = false } = (await getInput()) ?? {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  log.debug(`Running in ${type} mode`);

  if ([ActorType.Test, ActorType.Full].includes(type) === false) {
    log.error(`Actor type ${type} not yet implemented`);
    return;
  }

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    async requestHandler({ request, crawler, body, log }) {
      const { url, label} = request;
      log.info(`Processing ${url} (${label})`);
      const { document } = parseHTML(body.toString());

      switch (label) {
        case Labels.MAIN:
          {
            const requests = categoriesRequests({ document, country });
            const filtered = filterTestRequests({ requests, type });
            await crawler.requestQueue.addRequests(filtered, { forefront: true });
          }
          break;
        case Labels.CATEGORY: {
            const products = extractProducts({ document, stats, country, request });
            // await Dataset.pushData(products);
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

  await crawler.run([
    {
      url: completeUrl(country),
      label: Labels.MAIN
    }
  ]);

  log.info("crawler finished");

  if (type === ActorType.Full && Actor.isAtHome()) {
    await Promise.all([stats.save(true), uploadToKeboola(shopName(completeUrl(country)))]);
  }

  log.info("Finished.");
}

await Actor.main(main);
