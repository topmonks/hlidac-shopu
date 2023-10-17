import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, log, LogLevel } from "apify";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler, useState } from "@crawlee/http";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

const ROOT_URL = 'https://www.kaufland.cz/'

const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY",
  PRODUCTS: "PRODUCTS"
};

function handleCategories(document) {
  return document
    .querySelectorAll('li.rd-footer_navigation-link-list-item > a')
    .map(cat => ({
      url: new URL(cat.href, ROOT_URL).href,
      userData: {
        label: LABELS.CATEGORY,
      }
    }))
}

function handleSubcategories(document) {
  return document
    .querySelectorAll('li.rd-category-tree__list-item > a.rd-category-tree__anchor--level-1')
    .map(cat => ({
      url: new URL(cat.href, ROOT_URL).href,
      userData: {
        label: LABELS.CATEGORY,
      }
    }))
}

function extractProducts(document) {
  const productsInfoFromScript = {}
  const scriptWithProducts = document.querySelectorAll('script[data-n-head]')[1].textContent
  const productsFromScript = JSON.parse(scriptWithProducts);
  for (const product of productsFromScript) {
    const key = Array.isArray(product.image) ? product.image[0] : product.image;
    productsInfoFromScript[key] = {
      itemId: product.sku,
      itemUrl: product.offers.url,
      inStock: product.offers.availability === 'https://schema.org/InStock',
      currentPrice: product.offers.price,
      name: product.name,
    }
  }

  const products = document
    .querySelectorAll('article.product:not(:has(.product__sponsored-ad-label))')
    .map(product => {
      const itemName = product.querySelector('.product__title').textContent.trim();
      const img = product.querySelector("source").srcset.trim();
      const { itemId, itemUrl, inStock, currentPrice } = productsInfoFromScript[img];

      const discounted = product.querySelectorAll('.price__note--rrp').length > 0;
      const originalPrice = discounted ? cleanPrice(product.querySelector('.price__note--rrp').textContent) : null;

      return {
        itemId,
        itemUrl,
        itemName,
        img,
        discounted,
        originalPrice,
        currency: "CZK",
        currentPrice,
        category: "",
        inStock,
      }
    });

  return products;
}

async function saveProducts(products, stats, processedIds) {
  const productsToSave = [];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      productsToSave.push(product);
    } else {
      stats.inc('duplicates');
    }
  }

  stats.add('products', productsToSave.length);
  await Actor.pushData(productsToSave);
  return productsToSave.length;
}

function extractCategoryId(requestUrl, document) {
  if (requestUrl.includes('category')) {
    const categoryId = new URL(requestUrl).pathname.split('/')[2];
    return categoryId;
  }

  const scriptWithCategoryId = document.querySelectorAll('script:not([src], [data-n-head], [type])')[1].textContent.substring(5000, 10000);
  const regex = /url:"\\u002Fcategory\\u002F(\d+)/
  return scriptWithCategoryId.match(regex)[1];
}

function createPaginationRequests(productsCount, totalProductCount, categoryId) {
  const reminder = totalProductCount % productsCount > 0 ? 1 : 0;
  const nOfPages = (totalProductCount / productsCount) + reminder;

  const pageRequests = [];
  for (let i = 2; i < nOfPages; i++) {
    pageRequests.push({
      url: `https://www.kaufland.cz/category/${categoryId}/p${i}/`,
      userData: {
        label: LABELS.PRODUCTS,
      }
    });
  };
  return pageRequests;
}

async function main() {
  rollbar.init();

  // const processedIds = await useState("processedIds", {});
  const processedIds = new Set();
  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    duplicates: 0
  });

  const {
    development = true,
    debug,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full,
  } = await getInput();

  console.log(development);

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 400,
    maxRequestRetries,
    persistCookiesPerSession: true,
    proxyConfiguration,
    async requestHandler({ request, body, crawler }) {
      const {
        url,
        userData: { label }
      } = request;

      const { document } = parseHTML(body.toString());
      log.debug(`Scraping [${label}] - ${url}`);

      switch (label) {
        case LABELS.START:
          {
            const requests = handleCategories(document).slice(0, 1);
            stats.add("categories", requests.length);
            await crawler.addRequests(requests);
            log.info(`${request.url} - Found ${requests.length} categories`);
          }
          break;

        case LABELS.CATEGORY: {
          const isProductPage = document.querySelectorAll('div.rd-category-tree__nav').length === 0;
          if (isProductPage) {
            const products = extractProducts(document);
            const savedCount = await saveProducts(products, stats, processedIds);
            log.info(`${request.url} - Found ${products.length} products, saved ${savedCount}`);

            const totalProductCount = Number.parseInt(
              document.querySelector('.product-count').textContent.replace(/\s+/g, ""),
              10);

            const categoryId = extractCategoryId(request.url, document);
            log.info(`${request.url} - Found category ID: ${categoryId}`);

            const pageRequests = createPaginationRequests(products.length, totalProductCount, categoryId);
            await crawler.addRequests(pageRequests);

          } else {
            const requests = handleSubcategories(document).slice(0, 1);
            stats.add("categories", requests.length);
            await crawler.addRequests(requests);
            log.info(`${request.url} - Found ${requests.length} categories`);
          }
          break;
        };
        case LABELS.PRODUCTS: {
          const products = extractProducts(document);
          const savedCount = await saveProducts(products, stats, processedIds);
          log.info(`${request.url} - Found ${products.length} products, saved ${savedCount}`);
        }

      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequest = {
    url: "https://www.kaufland.cz/elektronika/",
    userData: {
      label: LABELS.CATEGORY,
    }
  };
  await crawler.run([startingRequest]);
  log.info("Crawler finished");

  await stats.save(true);

  if (!development) {
    const tableName = 'kaufland_cz';
    await uploadToKeboola(tableName);
  }
  log.info("Finished.");
}

await Actor.main(main);
