import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
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
  NEXT_PAGE_BUTTON: '.next',
  CATEGORY_NAME: 'h1',
  SINGLE_PRODUCT: '.content__catagories .product',
  UNAVAILABLE_BUTTON: '.watchDog',
  ITEM_URL: 'h3 a',
  ITEM_NAME: '.product__header-name',
  ITEM_IMAGE: '.product__image img',
  ITEM_PRICE_CURRENT: '.product__prices .pricevat.price',
  ITEM_PRICE_DISCOUNTED_FROM: '.product__prices .pricerecom',
};

/**
 * @param {string} country
 * @param {string} path
 * @param {string} category
 */
function completeUrl(country, path= "", category = "") {
  if (path && path[0] !== "/") {
    // sometimes path to next page is broken: href="lody-v-cokolade-a-jogurtu/p3"
    const [_, page] = path.split('/') // e.g. "lody-v-cokolade-a-jogurtu/p3" => "/p3"
    return `https://www.grizly.${country.toLowerCase()}${category}/${page}`
  }
  return `https://www.grizly.${country.toLowerCase()}${path}`;
}

function filterTestRequests({ requests, type, take = 10 }) {
  return type === ActorType.Test ? requests.slice(0, take) : requests;
}

function cleanPrice(string) {
  if (!string) {
    return undefined
  }
  return Number(string.replace(/\D/g, ''));
}

function categoriesRequests({ document, country}) {
  const links = document.querySelectorAll(Selectors.CATEGORIES_LINKS);
  return links.map(link => {
    log.debug(`Queued category "${link.innerText.trim()}"`);
    const href = link.getAttribute("href");
    const url = completeUrl(country, href)
    return {
      url,
      label: Labels.CATEGORY,
      userData: {
        category: href
      }
    };
  });
}

/**
 * @param {string} country
 * @param {HTMLDocument} document
 */
function extractProducts({ document, country }) {
  const category = document.querySelector(Selectors.CATEGORY_NAME).innerText.trim();
  const products = document.querySelectorAll(Selectors.SINGLE_PRODUCT);

  return products.map(product => {
    const itemId = product.getAttribute('data-id');
    const itemUrl = completeUrl(country, product.querySelector(Selectors.ITEM_URL).getAttribute('href'));
    const itemName = product.querySelector(Selectors.ITEM_NAME).innerText;
    const img = completeUrl(country, product.querySelector(Selectors.ITEM_IMAGE).getAttribute('src'));
    const currentPrice = cleanPrice(product.querySelector(Selectors.ITEM_PRICE_CURRENT).innerText.trim());
    const originalPrice = cleanPrice(product.querySelector(Selectors.ITEM_PRICE_DISCOUNTED_FROM)?.innerText.trim());
    const inStock = !product.querySelector(Selectors.UNAVAILABLE_BUTTON)
    return {
      itemId,
      itemUrl,
      itemName,
      img,
      discounted: !!originalPrice,
      originalPrice,
      currency: Currency[country],
      currentPrice,
      category,
      inStock
    }
  })
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

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"],
    useApifyProxy: type === ActorType.Full
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    proxyConfiguration,
    async requestHandler({ request, crawler, body, log }) {
      const { url, label, userData: {category}} = request;
      log.info(`Processing ${url} (${label})`);
      const { document } = parseHTML(body.toString());

      switch (label) {
        case Labels.MAIN:
          {
            const requests = categoriesRequests({ document, country, url });
            const filtered = filterTestRequests({ requests, type });
            stats.add("categories", filtered.length)
            await crawler.requestQueue.addRequests(filtered, { forefront: true });
          }
          break;
        case Labels.CATEGORY:
          {
            const categoryProductsCountNode = document.querySelector(Selectors.TOTAL_PRODUCTS_COUNT).getAttribute('value');
            if (!categoryProductsCountNode) {
              log.error(`No products count node found in ${request.url}`);
              return;
            }

            const nextPageButton = document.querySelector(Selectors.NEXT_PAGE_BUTTON);
            if (nextPageButton && type !== ActorType.Test ) {
              await crawler.requestQueue.addRequests([
                {
                  url: completeUrl(country, nextPageButton.getAttribute('href'), category),
                  label: Labels.CATEGORY,
                  userData: {
                    category
                  }
                }
              ]);
            }
            const products = extractProducts({ document, country })
            stats.add("items", products.length);
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

  await crawler.run([
    {
      url: completeUrl(country),
      label: Labels.MAIN
    }
  ]);

  // shortcut run example for testing:
  // await crawler.run([
  //   {
  //     url: 'https://www.grizly.cz/proteinove-tycinky',
  //     label: Labels.CATEGORY,
  //     userData: {
  //       category: "/proteinove-tycinky"
  //     }
  //   }
  // ]);

  log.info("crawler finished");

  if (type === ActorType.Full && Actor.isAtHome()) {
    await Promise.all([stats.save(true), uploadToKeboola(shopName(completeUrl(country)))]);
  }

  log.info("Finished.");
}

await Actor.main(main);
