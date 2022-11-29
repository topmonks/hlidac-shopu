import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { gotScraping } from "got-scraping";
import { DOMParser, parseHTML } from "linkedom";

const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};
const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};
const BASE_URL = "https://www.datart.cz";
const BASE_URL_SK = "https://www.datart.sk";

export const parseXML = (xml, globals = null) =>
  new DOMParser().parseFromString(xml, "text/xml", globals).defaultView;

async function countAllProducts(rootUrl, stats) {
  const { body } = await gotScraping.get(`${rootUrl}/sitemap/sitemapindex.xml`);
  const { document } = parseXML(body);
  const productXmlUrls = document
    .querySelectorAll("sitemap loc")
    .map(loc => loc.innerText.trim());
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for await (const xmlUrl of productXmlUrls) {
    const { body } = await gotScraping.get(xmlUrl);
    const { document } = parseXML(body);
    let readyForProductsLink = false;
    document.querySelectorAll("url priority").forEach(priority_ => {
      const priority = priority_.innerText.trim();
      //Will count only products link with priority "0.9" starting after category links with priority "0.5"
      if (priority === "0.9" && readyForProductsLink) {
        stats.inc("items");
      } else if (priority === "0.5" && !readyForProductsLink) {
        readyForProductsLink = true;
      }
    });
  }
  log.info(`Total items ${stats.get().items}x`);
}

/**
 *
 * @param {Document} document
 * @param {String} rootUrl
 * @param {COUNTRY.CZ|COUNTRY.SK} country
 * @returns {Promise<[]>}
 */
async function extractItems(document, rootUrl, country) {
  // products
  const categoryArr = Array.from(
    document.querySelectorAll("ol.breadcrumb > li > a")
  ).map(a => a.innerText.trim());

  return document
    .querySelectorAll("div.product-box-list div.product-box")
    .filter(productEl => productEl.getAttribute("data-track"))
    .map(productEl => {
      const result = {};
      const productBoxBuyInfoDelivery = productEl.querySelector(
        "div.product-box-buy-info > div.product-box-buy-info-delivery span.color-text-red"
      );
      result.inStock = Boolean(productBoxBuyInfoDelivery);

      const productBoxBuyInfoCart = productEl.querySelector(
        "div.product-box-buy-info > div.product-box-buy-info-cart"
      );
      const itemCartDataTarget = productBoxBuyInfoCart
        .querySelector("div.item-link-compare > button")
        .getAttribute("data-target-add");
      if (itemCartDataTarget) {
        const searchParams = new URLSearchParams(itemCartDataTarget);
        result.itemId = searchParams.get("id");
      }
      const productBoxTopSide = productEl.querySelector(
        "div.product-box-top-side"
      );
      const productHeader = productBoxTopSide.querySelector(
        "div.item-title-holder h3.item-title a"
      );
      result.itemName = productHeader.innerText.trim();
      result.itemUrl = rootUrl + productHeader.getAttribute("href");

      result.img = productBoxTopSide
        .querySelector("div.item-thumbnail img")
        .getAttribute("src");

      result.currentPrice = parseFloat(
        productBoxBuyInfoCart
          .querySelector("div.item-price div.actual")
          .innerText.trim()
          .replace(/[^\d,]+/g, "")
          .replace(",", ".")
      );
      const cutPrice = productBoxBuyInfoCart.querySelector(
        "div.item-price span.cut-price del"
      );

      if (cutPrice) {
        result.originalPrice = parseFloat(
          cutPrice.innerText
            .trim()
            .replace(/[^\d,]+/g, "")
            .replace(",", ".")
        );
        result.discounted = true;
      } else {
        result.originalPrice = null;
        result.discounted = false;
      }
      result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";

      result.category = categoryArr;

      return result;
    });
}

async function enqueueRequests(requestQueu, items) {
  for (const item of items) {
    await requestQueu.addRequest(item);
  }
}

function getLastPageNumber(arr) {
  // first and last buttons are arrows
  return arr.length > 3 ? Number(arr[arr.length - 2].innerText) : 0;
}

export async function main() {
  rollbar.init();
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const input = await KeyValueStore.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = COUNTRY.CZ,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input ?? {};

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
  // Get queue and enqueue first url.
  const requestQueue = await Actor.openRequestQueue();
  if (type === ActorType.BF) {
    await requestQueue.addRequest({
      url: `${rootUrl}/black-friday`,
      userData: {
        label: LABELS.BF
      }
    });
  } else if (type === "COUNT") {
    await countAllProducts(rootUrl, stats);
  } else if (type === ActorType.FULL) {
    await requestQueue.addRequest({
      url: `${rootUrl}/katalog`,
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === ActorType.TEST && country === COUNTRY.CZ) {
    await requestQueue.addRequest({
      url: `https://www.datart.cz/televize.html`,
      userData: {
        label: LABELS.CATEGORY
      }
    });
  } else if (type === ActorType.TEST && country === COUNTRY.SK) {
    await requestQueue.addRequest({
      url: `https://www.datart.sk/televizory.html`,
      userData: {
        label: LABELS.CATEGORY
      }
    });
  }

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    requestHandler: async ({ request, session, response, log, body }) => {
      if (response.statusCode !== 200) {
        session.retire();
      }
      const { document } = parseHTML(body.toString());
      // Process START page
      if (request.userData.label === LABELS.START) {
        const items = document
          .querySelectorAll(
            "div.microsite-katalog ul.category-submenu > li > a"
          )
          .map(a => {
            const link = a.getAttribute("href");
            //log.info(`${rootUrl}${link}`);
            return {
              url: `${rootUrl}${link}`,
              userData: {
                label: LABELS.CATEGORY,
                uniqueKey: Math.random()
              }
            };
          });
        log.info(`${request.url} Found ${items.length} categories`);
        await enqueueRequests(requestQueue, items);
      }
      // Process CATEGORY page
      if (request.userData.label === LABELS.CATEGORY) {
        try {
          // Add subcategories if this category has also products
          const subcategories = document.querySelectorAll(
            "div.subcategory-box-list .subcategoryWrapper a"
          );
          if (subcategories.length > 0) {
            const items = subcategories.map(a => {
              const link = a.getAttribute("href");
              return {
                url: `${rootUrl}${link}`,
                userData: {
                  label: LABELS.CATEGORY,
                  uniqueKey: Math.random()
                }
              };
            });
            stats.add("categories", items.length);
            log.info(`${request.url} Found ${items.length} subcategories`);
            await enqueueRequests(requestQueue, items);
            return; // Nothing more we can do for this page
          }
          // Add categories if this page has only categories and no products
          const categoryTree = document.querySelectorAll(
            "div.category-tree-box-list a"
          );
          if (categoryTree.length > 0) {
            const categories = categoryTree.map(a => {
              const link = a.getAttribute("href");
              return {
                url: `${rootUrl}${link}`,
                userData: {
                  label: LABELS.CATEGORY,
                  uniqueKey: Math.random()
                }
              };
            });
            stats.add("categories", categories.length);
            log.info(`${request.url} Found ${categories.length} categories`);
            await enqueueRequests(requestQueue, categories);
            return; // Nothing more we can do for this page
          }
          //No more categories and subcategories continue with find maxPaginationPage
          const lastPagination = getLastPageNumber(
            document.querySelectorAll("div.pagination-wrapper ul.pagination a")
          );
          // Add pages from pagination
          const items = [];
          for (let i = 2; i <= lastPagination; i++) {
            items.push({
              url: `${request.url}?showPage&page=${i}&limit=16`,
              userData: {
                label: LABELS.CATEGORY_NEXT,
                uniqueKey: Math.random()
              }
            });
            //log.info(`${request.url}?showPage&page=${i}&limit=16`);
          }
          stats.add("pages", items.length);
          log.info(`${request.url} Adding ${items.length} pagination pages`);
          await enqueueRequests(requestQueue, items);
        } catch (e) {
          log.info(`Error processing url ${request.url}`);
          log.error(e);
        }
      }

      // Extract products from category page
      if (
        request.userData.label === LABELS.CATEGORY ||
        request.userData.label === LABELS.CATEGORY_NEXT
      ) {
        try {
          const products = await extractItems(document, rootUrl, country);
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          for (const product of products) {
            const s3item = { ...product };
            //Keboola data structure fix
            delete product.inStock;
            // Save data to dataset
            if (!processedIds.has(product.itemId)) {
              processedIds.add(product.itemId);
              requests.push(
                Dataset.pushData(product),
                uploadToS3v2(s3, s3item)
              );
              stats.inc("items");
            } else {
              stats.inc("itemsDuplicity");
            }
          }
          log.info(
            `${request.url} Found ${requests.length / 2} unique products`
          );
          // await all requests, so we don't end before they end
          await Promise.all(requests);
        } catch (e) {
          log.error(e);
          log.error(`Failed to get products from page ${request.url}`);
          await Dataset.pushData({
            status: "Failed to get products",
            url: request.url
          });
        }
      }

      if (request.userData.label === LABELS.BF) {
        log.info(`START BF ${request.url}`);
        const categories = document
          .querySelectorAll(".ms-category-box")
          .map(a => ({
            url: `${rootUrl}${a.getAttribute("href")}`,
            userData: {
              label: LABELS.CATEGORY
            }
          }));
        log.info(`Found ${categories.length} BF categories`);
        await enqueueRequests(requestQueue, categories);
      }
    },
    failedRequestHandler: async ({ request, log }, error) => {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run();
  await stats.save(true);
  log.info("crawler finished");

  try {
    let tableName = "";

    if (type === ActorType.FULL && country === "CZ") {
      tableName = "datart";
    } else if (type === ActorType.FULL && country === "SK") {
      tableName = "datart_sk";
    } else if (type !== ActorType.FULL && country === "CZ") {
      tableName = "datart_bf";
    } else if (type !== ActorType.FULL && country === "SK") {
      tableName = "datart_sk_bf";
    }

    if (!development) {
      await invalidateCDN(
        cloudfront,
        "EQYSHWUECAQC9",
        `datart.${country.toLowerCase()}`
      );
      log.info("invalidated Data CDN");
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    }
  } catch (e) {
    log.error(e);
  }

  log.info("Finished.");
}

await Actor.main(main);
