import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "linkedom/cached";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

/** @enum {string} */
export const Labels = {
  START: "START",
  SUB_CATEGORY: "SUB_CATEGORY",
  CATEGORY: "CATEGORY",
  CATEGORY_PAGE: "CATEGORY_PAGE",
  PRODUCT_DETAIL: "PRODUCT_DETAIL"
};

/** @enum {string} */
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

export const rootCZ = "https://www.pilulka.cz";
export const rootSK = "https://www.pilulka.sk";

export const rootWebUrl = country => (country === Country.CZ ? rootCZ : rootSK);

export function buildUrl(domain, link) {
  if (!link) return null;
  if (link.startsWith("http")) {
    return link;
  }
  if (link.startsWith("/")) {
    return `${domain}${link}`;
  }
  return `${domain}/${link}`;
}

function startingRequests(document, country) {
  let categories = document
    .querySelectorAll("#js-main-nav-box .js_level-2 a.main-nav__item__dropdown")
    .map(a => {
      const category = [
        a
          .closest(".main-nav__item.js_level-1")
          .querySelector("a.main-nav__item__dropdown")
          .innerText.trim(),
        a.innerText.trim()
      ];

      return {
        url: buildUrl(rootWebUrl(country), a.href),
        userData: { label: Labels.CATEGORY, category }
      };
    });
  if (categories.length === 0) {
    categories = document
      .querySelectorAll(
        "#js-main-nav-box .js_level-1 a.main-nav__item__dropdown"
      )
      .map(a => ({
        url: buildUrl(rootWebUrl(country), a.href),
        userData: {
          label: Labels.SUB_CATEGORY,
          category: [a.innerText.trim()]
        }
      }));
  }

  log.info(`Found ${categories.length} categories.`);
  return categories;
}

function subCategoryRequests(document, request, country) {
  const categories = document
    .querySelectorAll(".subcategories .subcategories__link")
    .map(a => {
      const { category } = request.userData;
      category.push(a.innerText.trim().split("\n")[0].trim());

      return {
        url: buildUrl(rootWebUrl(country), a.href),
        userData: { label: Labels.CATEGORY, category }
      };
    });
  log.info(`Found ${categories.length} categories.`);
  return categories;
}

function categoryRequests(document, request) {
  let maxPage = 0;
  const pages = [];

  const paginationLinks = document.querySelectorAll(
    "#pagination ul.pagination li a.pagination__link"
  );
  if (paginationLinks.length) {
    maxPage = parseInt(paginationLinks.at(-1).innerText, 10);
  }

  for (let i = 2; i <= maxPage; i++) {
    pages.push({
      url: `${request.url}?page=${i}`,
      userData: {
        label: Labels.CATEGORY_PAGE,
        category: request.userData.category
      }
    });
  }
  log.info(
    `Found ${pages.length} pages for category ${request.userData.category}.`
  );
  return pages;
}

function parsePrice(text, country) {
  if (!text) return null;
  return parseFloat(
    text
      .replace(/\s/g, "")
      .replace(country === "CZ" ? "Kč" : "€", "")
      .replace(",", ".")
      .trim()
  );
}

function getOriginalPrice(item, country) {
  const selector =
    item.querySelector("data-event") === "ProductTopCategory"
      ? ".top-product__add-to-cart--container a s.text-gray"
      : ".product-prev__price-discount";
  return parsePrice(item.querySelector(selector)?.innerText, country);
}

function extractProduts(document, request, country) {
  const products = document.querySelector(".product-cards, .top-product-cards");
  if (!products) return [];
  return products
    .querySelectorAll(".product-prev__content")
    .map(item => {
      const name = item.querySelector("picture img").getAttribute("alt");
      const id = item.querySelector('form input[name="productId"]')?.value;
      if (!id) {
        log.warning(`Skip product without id [${name}] ${request.url}`);
        return;
      }
      const link = item
        .querySelector("a.product-prev__title")
        .getAttribute("href");
      const imgLink = item
        .querySelector("picture img")
        .getAttribute("data-src");
      const shortDesc = item
        .querySelector(".product-prev__description")
        ?.innerText?.trim();
      const availability = item
        .querySelector(".js-trigger-availability-modal span")
        .innerText.trim();
      const currentPrice = parsePrice(
        item
          .querySelector(".js-trigger-availability-modal")
          .getAttribute("data-product-price")
      );

      if (Number.isNaN(currentPrice) || currentPrice <= 0) {
        log.warning(`Skip product without price [${name}] ${request.url}`);
        return;
      } else {
        const originalPrice = getOriginalPrice(item, country);
        const itemUrl = buildUrl(rootWebUrl(country), link);
        const isDiscounted = !Number.isNaN(originalPrice) && originalPrice > 0;

        return {
          itemId: id,
          itemName: name,
          itemUrl,
          shop: shopName(itemUrl),
          slug: itemSlug(itemUrl),
          img: buildUrl(rootWebUrl(country), imgLink),
          shortDesc,
          availability,
          category: request.userData.category,
          originalPrice: isDiscounted ? originalPrice : null,
          currentPrice,
          discounted: isDiscounted
        };
      }
    })
    .filter(Boolean);
}

function extractProductFromDetail(document, request, country) {
  const result = {};

  const currentPrice = parseFloat(
    document
      .querySelector("form.js-amount-add")
      .getAttribute("data-at-product-price")
      .replace(/\s/g, "")
  );
  const originalPrice = parseFloat(
    document
      .querySelector("#js-product-layer-pc .product-layer__grid-old-price")
      .innerText.replace(/\s/g, "")
  );
  const detailTable = document.querySelector(
    "#product-info .product-detail__table"
  );

  result.img = buildUrl(
    rootWebUrl(country),
    document
      .querySelector(".product-detail__images picture img")
      .getAttribute("data-src")
  );
  result.itemId = document.querySelector('form input[name="productId"]').value;
  result.itemUrl = request.url;
  result.itemName = document
    .querySelector("h1.product-detail__main-heading")
    .innerText.trim();
  result.shortDesc = document
    .querySelector(".product-detail__reduced > div > div > p")
    .innerText.trim();
  result.availability = document
    .querySelector('div[data-event="ProductDetailMaster"] > strong')
    .innerText.trim();
  result.sukl = detailTable
    .querySelector('tr:contains("SUKL kód:") td:nth-child(2)')
    .innerText.trim();
  result.ean = detailTable
    .querySelector('tr:contains("EAN:") td:nth-child(2)')
    .innerText.trim();
  result.category = request.userData.category;

  if (!Number.isNaN(currentPrice) && currentPrice > 0) {
    if (!Number.isNaN(originalPrice) && originalPrice > 0) {
      result.originalPrice = originalPrice;
      result.currentPrice = currentPrice;
      result.discounted = true;
    } else {
      result.originalPrice = null;
      result.currentPrice = currentPrice;
      result.discounted = false;
    }
  } else {
    log.warning(`Skip non price product [${result.itemName}] ${request.url}`);
  }
  return result;
}

async function saveProducts(s3, products, stats, processedIds) {
  const requests = [Dataset.pushData(products)];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(uploadToS3v2(s3, product));
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  await Promise.all(requests);
}

async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = (await KeyValueStore.getInput()) || {};
  const {
    development = process.env.TEST,
    debug = false,
    test = false,
    country = Country.CZ,
    maxRequestRetries = 4,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full,
    bfUrls = ["https://www.pilulka.cz/akce-a-slevy-black-friday"],
    parseDetails = false
  } = input;

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const processedIds = new Set();
  const stats = await withPersistedStats(x => x, {
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 300,
    useSessionPool: true,
    maxRequestRetries,
    async requestHandler({ body, request, crawler, enqueueLinks }) {
      const { document } = parseHTML(body.toString());
      switch (request.userData.label) {
        case Labels.START:
          {
            log.info(
              `START scraping pilulka.${country} type=${type} test=${test}`
            );
            const requests = startingRequests(document, country);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        case Labels.SUB_CATEGORY:
          {
            log.info(`START with sub_category ${request.url}`);
            const requests = subCategoryRequests(document, request, country);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Labels.CATEGORY:
          {
            log.info(`START with category ${request.url}`);
            const requests = categoryRequests(document, request);
            await crawler.requestQueue.addRequests(requests);
            if (parseDetails) {
              return enqueueLinks({
                selector:
                  ".product-cards a.product-prev__title, .top-product-cards a.product-prev__title",
                baseUrl: request.loadedUrl,
                transformRequestFunction: req => {
                  req.userData = request.userData;
                  req.userData.label = Labels.PRODUCT_DETAIL;
                  return req;
                }
              });
            }
            const products = extractProduts(document, request, country);
            await saveProducts(s3, products, stats, processedIds);
          }
          break;
        case Labels.CATEGORY_PAGE:
          {
            if (parseDetails) {
              return enqueueLinks({
                selector:
                  ".product-cards a.product-prev__title, .top-product-cards a.product-prev__title",
                baseUrl: request.loadedUrl,
                transformRequestFunction: req => {
                  req.userData = request.userData;
                  req.userData.label = Labels.PRODUCT_DETAIL;
                  return req;
                }
              });
            }
            const products = extractProduts(document, request, country);
            log.info(`Found ${products.length} products on ${request.url}`);
            await saveProducts(s3, products, stats, processedIds);
          }
          break;
        case Labels.PRODUCT_DETAIL:
          {
            const product = extractProductFromDetail(
              document,
              request,
              country
            );
            await saveProducts(s3, [product], stats, processedIds);
          }
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const requests = [];
  if (type === ActorType.BlackFriday) {
    for (const url of bfUrls) {
      requests.push({
        url,
        userData: { label: Labels.CATEGORY }
      });
    }
  } else {
    requests.push({
      url: rootWebUrl(country),
      userData: { label: Labels.START }
    });
  }
  await crawler.run(requests);

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `pilulka.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    let tableName = country === Country.CZ ? "pilulka_cz" : "pilulka_sk";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }

    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main, { statusMessage: "Finished." });
