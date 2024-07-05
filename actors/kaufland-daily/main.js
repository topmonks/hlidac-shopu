import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, LogLevel, log } from "apify";

const ROOT_URL = "https://www.kaufland.cz/";
const PROCESSED_IDS_KEY = "processedIds";

const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY"
};

function handleTopLevelCategories(document) {
  return document.querySelectorAll("li.rd-footer_navigation-link-list-item > a").map(cat => ({
    url: new URL(cat.href, ROOT_URL).href,
    label: LABELS.CATEGORY,
    userData: {
      categories: [cat.textContent.trim()]
    }
  }));
}

function handleSubcategories(document, prevCategories, previousUrl) {
  const categories = document.querySelectorAll(
    ".rd-category-tree__nav > ul > li:first-child a.rd-category-tree__anchor--level-1"
  );

  // sometimes links to other categories are loaded dynamically with js, so we need to check,
  // if we actually scraped some links
  if (categories.length > 0) {
    return categories.map(cat => ({
      url: new URL(cat.href, ROOT_URL).href,
      label: LABELS.CATEGORY,
      userData: {
        categories: [...prevCategories, cat.textContent.trim()],
        previousUrl
      }
    }));
  }

  // the category elements we scraped previously have no links: we need to
  // find the ID of each category to construct its corresponding url, the IDs
  // can be retrieved from this script element
  const scriptWithCategoryIds = document.querySelectorAll("script:not([src], [data-n-head], [type])")[1].textContent;
  return document.querySelectorAll("li.rd-category-tree__list-item > span").reduce((results, cat) => {
    const categoryName = cat.textContent.trim();
    // there are 2 ways how the ID can be stored in the script so that's why 2 regexes
    const regex = new RegExp(`\\s*${categoryName}\\s*\\",\\"\\\\u002Fcategory\\\\u002F(\\d+)`);
    const alternativeRegex = new RegExp(`\\s*${categoryName}\\s*\\",path:\\"\\\\u002Fcategory\\\\u002F(\\d+)`);
    const regexMatch = scriptWithCategoryIds.match(regex) ?? scriptWithCategoryIds.match(alternativeRegex);
    if (!regexMatch) {
      // should not happen or very rarely
      log.warning(`Was unable to find categoryId for ${categoryName}, skipping`);
      return results;
    }
    const categoryId = regexMatch[1];
    results.push({
      url: new URL(`/category/${categoryId}/`, ROOT_URL).href,
      label: LABELS.CATEGORY,
      userData: {
        categories: [...prevCategories, cat.textContent.trim()],
        previousUrl
      }
    });
    return results;
  }, []);
}

function extractProducts(document, categories) {
  // to extract info about the products, we need to combine information from both
  // the 'article' elements on the page and the script containing additional info about the products:
  //
  // article elements -> miss availability info and sometimes miss product IDs and URLs,
  // script -> misses discounts.

  // we use part of the image url as a way to connect script info <-> elements info
  const keyFromImg = imgUrl => {
    return imgUrl.split("/").slice(-1);
  };

  const productsInfoFromScript = {};
  const scriptWithProducts = document
    .querySelectorAll("script[data-n-head]")
    .find(s => s.textContent.includes(`"@type":"Product"`));
  const productsFromScript = JSON.parse(scriptWithProducts.textContent);
  for (const product of productsFromScript) {
    const key = keyFromImg(Array.isArray(product.image) ? product.image[0] : product.image);
    productsInfoFromScript[key] = {
      itemId: product.sku.toString(),
      itemUrl: product.offers.url,
      inStock: product.offers.availability === "https://schema.org/InStock",
      currentPrice: Number.parseFloat(product.offers.price),
      name: product.name
    };
  }

  const products = document.querySelectorAll("article.product:not(:has(.product__sponsored-ad-label))").map(product => {
    const itemName = product.querySelector(".product__title").textContent.trim();
    const img = product.querySelector("source").srcset.trim();

    const { itemId, itemUrl, inStock, currentPrice } = productsInfoFromScript[keyFromImg(img)];

    const discountedEl = product.querySelector(".price-note--rrp");
    const originalPrice = discountedEl ? cleanPrice(discountedEl.textContent) : null;

    return {
      itemId,
      itemUrl,
      itemName,
      img,
      discounted: !!originalPrice,
      originalPrice,
      currency: "CZK",
      currentPrice,
      category: categories,
      inStock
    };
  });

  return products;
}

async function saveProducts(products, stats, processedIds) {
  const productsToSave = [];
  for (const product of products) {
    if (processedIds.has(product.itemId)) {
      stats.inc("duplicates");
    } else {
      processedIds.add(product.itemId);
      productsToSave.push(product);
    }
  }

  stats.add("products", productsToSave.length);
  await Actor.pushData(productsToSave);
  return productsToSave.length;
}

// we need to extract category IDs to create pagination requests as they sometimes
// mask the urls, for example they use 'https://www.kaufland.cz/mobily/' as the first
// page, but 'https://www.kaufland.cz/category/38371/p2/' as the second, we use script
// element for that as well
function extractCategoryId(requestUrl, document) {
  if (requestUrl.includes("category")) {
    const categoryId = new URL(requestUrl).pathname.split("/")[2];
    return categoryId;
  }

  const scriptWithCategoryId = document
    .querySelectorAll("script:not([src], [data-n-head], [type])")[1]
    .textContent.substring(5000, 10000);
  const regex = /url:"\\u002Fcategory\\u002F(\d+)/;
  return scriptWithCategoryId.match(regex)[1];
}

function createPaginationRequests(productsCount, totalProductCount, categoryId, categories) {
  const reminder = totalProductCount % productsCount > 0 ? 1 : 0;
  const nOfPages = totalProductCount / productsCount + reminder;

  const pageRequests = [];
  for (let i = 2; i < nOfPages; i++) {
    pageRequests.push({
      url: `https://www.kaufland.cz/category/${categoryId}/p${i}/`,
      label: LABELS.CATEGORY,
      userData: {
        categories,
        pagination: true
      }
    });
  }
  return pageRequests;
}

async function main() {
  rollbar.init();

  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) || []);
  Actor.on("persistState", async () => {
    await Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds));
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    duplicates: 0
  });

  const input = await Actor.getInput();
  const {
    development = true,
    debug = false,
    proxyGroups = [],
    type = ActorType.Full,
    bfUrl = "https://www.kaufland.cz/campaigns/blackweek-cz/",
    bfPagesCount = 19
  } = input || {};

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 400,
    maxRequestRetries: 5,
    persistCookiesPerSession: true,
    proxyConfiguration,
    async requestHandler({ request, body, crawler, response }) {
      if (response.statusCode === 404) {
        log.warning(`${request.url} returned 404, skipping`);
        return;
      }

      const { document } = parseHTML(body.toString());
      log.debug(`Scraping [${request.label}] - ${request.url}`);

      const { categories = [], pagination = false, previousUrl = "" } = request.userData;

      // some categories are listed but actually don't exist (redirect to higher category),
      // so we need to check for that
      if (request.loadedUrl === previousUrl) {
        log.info(`Skipping as ${request.url} redirected back to ${previousUrl}`);
        return;
      }

      const hasSubcategories = document.querySelectorAll("div.rd-category-tree__nav").length > 0;
      if (request.label === LABELS.START || hasSubcategories) {
        const requests =
          request.label === LABELS.START
            ? handleTopLevelCategories(document)
            : handleSubcategories(document, categories, request.url);

        stats.add("categories", requests.length);

        if (type === ActorType.Test) {
          await crawler.addRequests(requests.slice(0, 1));
        } else {
          await crawler.addRequests(requests);
        }
        log.info(`${request.url} - Found ${requests.length} categories`);
        return;
      }

      // we are on a page with products so we scrape them
      const products = extractProducts(document, categories);
      const savedCount = await saveProducts(products, stats, processedIds);
      log.info(`${request.url} - Found ${products.length} products, saved ${savedCount}`);

      // we need to create requests for other pages on page 1, so this is a check
      // if we are on a page different than 1
      if (pagination) {
        return;
      }

      if (type === ActorType.BlackFriday) {
        // doesn't work because it's client side rendered
        // document.querySelectorAll(".rd-pagination .rd-page--page");
        // .at(-1).textContent;
        const pageRequests = restPageUrls(bfPagesCount, pageNr => ({
          url: `${bfUrl}?page=${pageNr}`,
          userData: {
            label: LABELS.CATEGORY
          }
        }));
        await crawler.addRequests(pageRequests);
      } else {
        const totalProductCount = Number.parseInt(
          document.querySelector(".product-count").textContent.replace(/\s+/g, ""),
          10
        );

        // check if there actually are more pages
        if (totalProductCount > products.length) {
          const categoryId = extractCategoryId(request.url, document);
          log.debug(`${request.url} - Found category ID: ${categoryId}`);
          const pageRequests = createPaginationRequests(products.length, totalProductCount, categoryId, categories);

          if (type === ActorType.Test) {
            await crawler.addRequests(pageRequests.slice(0, 3));
          } else {
            await crawler.addRequests(pageRequests);
          }
        }
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequest =
    type === ActorType.BlackFriday
      ? {
          url: bfUrl,
          label: LABELS.CATEGORY
        }
      : {
          url: ROOT_URL,
          label: LABELS.START
        };
  await crawler.run([startingRequest]);
  log.info("Crawler finished");

  await stats.save(true);

  if (!development) {
    const tableName = type === ActorType.BlackFriday ? "kaufland_cz_bf" : "kaufland_cz";
    await uploadToKeboola(tableName);
  }
  log.info("Finished.");
}

await Actor.main(main);
