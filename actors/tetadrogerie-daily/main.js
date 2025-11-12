import { URL, URLSearchParams } from "url";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, LogLevel, log } from "apify";
import { PlaywrightCrawler, useState } from "@crawlee/playwright";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * Modifies the page parameter in a URL for pagination
 * @param {string} originalUrl - The original URL to modify
 * @param {number} [newPage=1] - The new page number to set
 * @returns {string} Modified URL with updated page parameters
 */
function changeListingUrlPage(originalUrl, newPage = 1) {
  newPage = String(newPage);

  const url = new URL(originalUrl);
  url.searchParams.set("page", String(newPage));
  url.searchParams.set("strana", String(newPage)); // Yes, it is really set twice on the API

  return url.href;
}

/**
 * Converts a traditional category URL to the corresponding API URL format
 * @param {string} url - The traditional category URL to convert
 * @returns {string} The converted API URL or original URL if no conversion needed
 */
function translateToApiUrl(url) {
  const traditionalUrlRegexp = /https:\/\/www\.tetadrogerie\.cz\/eshop\/produkty\//;

  // Translates traditional category URL to the API one
  if (traditionalUrlRegexp.test(url)) {
    const currentPage = new URL(url).searchParams.get('strana') || '1';
    const taxon = url.replace(traditionalUrlRegexp, '')
      .replace(/\?|&.*/g, '');
    return createListingProductApiUrl(taxon, currentPage);
  }
  return url;
}

/**
 * @param {string} categorySlug
 * @param {number=1} currentPage
 */
function createListingProductApiUrl(categorySlug, currentPage = 1) {
  currentPage = String(currentPage);
  const newUrl = new URL(
    `https://be.tetadrogerie.cz/api/v2/shop/search/products-variants?${new URLSearchParams({
      taxon: categorySlug,
      page: String(currentPage),
      itemsPerPage: "40",
      sort: "asc",
      order_by: "price",
      strana: String(currentPage), // Yes, it is really like that on the API
    })}`
  );

  return newUrl.href;
}

const categoryLinkSelectors = [
  // 1st level categories - includes all the products, other levels are not included in the initial response, so it
  // cannot be easily scraped by HttCrawler. As this includes all the products, it is not needed to scraped other
  // category levels
  ".c-menu-item__link-wrapper > a"
];

/**
 * Extracts category URLs from the document based on predefined selectors
 * @param {Document} document - The parsed HTML document
 * @returns {string[]} Array of absolute category URLs
 */
function categoryRequests(document) {
  const ROOT_URL = "https://www.tetadrogerie.cz";
  const requests = [];
  for (const selector of categoryLinkSelectors) {
    for (const category of document.querySelectorAll(`.c-main-menu ${selector}`)) {
      requests.push(new URL(category.href, ROOT_URL).href);
    }
  }
  return requests;
}

/**
 * Builds a hierarchical category path from product taxons
 * @param {Array} categories - Array of category objects with hierarchy information
 * @returns {string|null} Category path separated by ' > ' or null if no categories
 */
function resolveCategory(categories) {
  if (!categories?.length) return null;

  const categoryPath = [];
  let currentCategory = categories[0];

  // Build category path from first level down
  while (currentCategory) {
    categoryPath.push(currentCategory.name);
    currentCategory = categories.find(
      category => category.parent.code === currentCategory.code
    );
  }

  return categoryPath.length ? categoryPath.join(' > ') : null;
}

/**
 * Parses product items from API response
 * @param json - API response containing product items
 * @returns {Array} Parsed product items
 */
function parseItems(json) {
  return json.items.map((item) => {
    const originalPrice = (item.bbyPrices.zcmd ?? item.originalPrice ?? item.price) / 100;
    let currentPrice = (item.bbyPrices.acmd ?? item.currentPrice ?? item.price) / 100;

    // We do not consider multi-item discount as a discount
    const isMultiItemDiscount = /za\s+.*ks\s+při\s+koupi.*\s+ks/i.test(item.bbyPrices.conditions);
    if (isMultiItemDiscount) {
      currentPrice = originalPrice;
    }

    return {
      itemId: String(item.code).replace(/^0+/g, ''),
      itemName: item.name.replace(/<[^>]*>/g, ''),
      img: `https://teta-drogerie.fra1.digitaloceanspaces.com/cache/inveocz_product_gallery/${item.image}`,
      slug: item.slug,
      itemUrl: `https://www.tetadrogerie.cz/eshop/katalog/${item.slug}`,
      currentPrice,
      originalPrice: currentPrice !== originalPrice ? originalPrice : null,
      discounted: originalPrice > currentPrice,
      inStock: item.isStockAvailable,
      category: resolveCategory(item.taxa)
    }
  });
}

async function main() {
  rollbar.init();
  const processedIds = await useState("processedIds", {});

  const {
    development,
    debug,
    test,
    maxRequestRetries,
    type = ActorType.Full,
    bfUrl = "https://www.tetadrogerie.cz/eshop/produkty/stitky-entilos-black-friday"
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats({
    categories: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    useApifyProxy: !development
  });

  const crawler = new PlaywrightCrawler({
    autoscaledPoolOptions: {
      autoscaleIntervalSecs: 5
    },
    proxyConfiguration,
    maxRequestRetries,
    navigationTimeoutSecs: 30,
    useSessionPool: true,
    persistCookiesPerSession: true,
    preNavigationHooks: [async ({ blockRequests }) => {
      await blockRequests(); // block images, stylesheets, etc.
    }],
    async requestHandler({ request, response, page }) {
      let { label, initial } = request.userData;

      log.info("Processing page", { url: request.url, label });

      await page.waitForLoadState("load");

      switch (label) {
        case "START":
          const { document } = parseHTML((await response.body()).toString());

          const initialCategoryUrls = await page.$$eval('.c-main-menu .c-menu-item__link-wrapper > a', (links) => {
            return [...links].map(link => link.href);
          });

          const initialCategoryRequests = initialCategoryUrls.map((url) => ({
            url,
            userData: {
              initial: true, // to generate pagination requests for the initial categories only once
            }
          }));

          stats.add("categories", initialCategoryRequests.length);
          await crawler.requestQueue.addRequests(initialCategoryRequests);
        default: // any category overview page
          const categoryUrlRegexp = /^https:\/\/www\.tetadrogerie\.cz\/eshop\/produkty\//;

          // Translates traditional category URL to the API one
          if (categoryUrlRegexp.test(request.url)) {
            const currentPage = new URL(request.url).searchParams.get('strana') || '1';
            const initialCategorySlug = request.url.replace(categoryUrlRegexp, '')
              .replace(/[?&].*/g, '');
            const fetchApiUrl = createListingProductApiUrl(initialCategorySlug, currentPage);

            const json = await page.evaluate(async ({fetchApiUrl}) => {
              return await fetch(fetchApiUrl).then(res => res.json());
            }, { fetchApiUrl });

            if (json.message) {
              log.warning(`problem during processing: ${request.url}`);
              throw new Error(json.message);
            }

            log.info(`Pagination info for slug: ${request.url}`, json.pagination);

            if (initial) {
              // resolve pagination
              const paginationUrls = [];
              for (let page = 1; page <= json.pagination.lastPage; page++) {
                const url = changeListingUrlPage(request.url, page);
                paginationUrls.push({url});
              }
              await crawler.requestQueue.addRequests(paginationUrls);
            }

            const products = parseItems(json);

            await saveUniqProducts({
              products,
              stats,
              processedIds
            });
          }
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startingRequests = [];
  if (development && test) {
    startingRequests.push({
      url: "https://www.tetadrogerie.cz/eshop/produkty/hubeni-hmyzu",
      userData: {
        initial: true,
      }
    });
  } else if (type === ActorType.BlackFriday) {
    startingRequests.push({
      url: bfUrl,
      userData: {
        initial: true,
      }
    });
  } else {
    startingRequests.push({
      url: `https://www.tetadrogerie.cz/eshop/`,
      userData: {
        label: "START",
        initial: true,
      }
    });
  }
  await crawler.run(startingRequests);

  if (!development) {
    let tableName = "teta_cz";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("invalidated Data CDN");
  }
  log.info("Finished.");
}

await Actor.main(main);
