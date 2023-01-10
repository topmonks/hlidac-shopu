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
import { DOMParser, parseHTML } from "linkedom/cached";

/** @enum */
const Labels = {
  START: "START",
  COUNT: "COUNT",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};

/** @enum */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

const BASE_URL = "https://www.datart.cz";
const BASE_URL_SK = "https://www.datart.sk";

export const parseXML = (xml, globals = null) =>
  new DOMParser().parseFromString(xml, "text/xml", globals).defaultView;

async function countAllProducts({ body, stats }) {
  const { document } = parseXML(body.toString());
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
      // Will count only products link with priority "0.9" starting after category links with priority "0.5"
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
 * @param {string} rootUrl
 * @param {Country.CZ|Country.SK} country
 * @returns {Object[]>}
 */
function extractItems(document, rootUrl, country) {
  const categories = document
    .querySelectorAll("ol.breadcrumb > li > a")
    .map(a => a.innerText.trim());

  return document
    .querySelectorAll("div.product-box-list div.product-box")
    .filter(productEl => productEl.getAttribute("data-track"))
    .map(productEl => {
      const productBoxTopSide = productEl.querySelector(
        "div.product-box-top-side"
      );
      const productHeader = productBoxTopSide.querySelector(
        "div.item-title-holder h3.item-title a"
      );
      const productBoxBuyInfoDelivery = productEl.querySelector(
        "div.product-box-buy-info > div.product-box-buy-info-delivery span.color-text-red"
      );

      const result = {
        productBoxBuyInfoDelivery,
        inStock: Boolean(productBoxBuyInfoDelivery),
        currency: country === Country.CZ ? "CZK" : "EUR",
        category: categories,
        itemName: productHeader.innerText.trim(),
        itemUrl: `${rootUrl}${productHeader.getAttribute("href")}`,
        img: productBoxTopSide
          .querySelector("div.item-thumbnail img")
          .getAttribute("src")
      };

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

      return result;
    });
}

function getLastPageNumber(arr) {
  // first and last buttons are arrows
  return arr.length > 3 ? Number(arr[arr.length - 2].innerText) : 0;
}

function startingRequest({ rootUrl, country, type }) {
  if (type === ActorType.BF) {
    return {
      url: `${rootUrl}/black-friday`,
      userData: {
        label: Labels.BF
      }
    };
  } else if (type === "COUNT") {
    return {
      url: `${rootUrl}/sitemap/sitemapindex.xml`,
      userData: {
        label: Labels.COUNT
      }
    };
  } else if (type === ActorType.FULL) {
    return {
      url: `${rootUrl}/katalog`,
      userData: {
        label: Labels.START
      }
    };
  } else if (type === ActorType.TEST && country === Country.CZ) {
    return {
      url: `https://www.datart.cz/televize.html`,
      userData: {
        label: Labels.CATEGORY
      }
    };
  } else if (type === ActorType.TEST && country === Country.SK) {
    return {
      url: `https://www.datart.sk/televizory.html`,
      userData: {
        label: Labels.CATEGORY
      }
    };
  }
}

export async function main() {
  rollbar.init();
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = process.env.TEST || process.env.DEBUG,
    maxRequestRetries = 3,
    country = Country.CZ,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input;

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const rootUrl = country === Country.CZ ? BASE_URL : BASE_URL_SK;

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    maxRequestsPerMinute: 400,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    async requestHandler({ request, log, body, enqueueLinks }) {
      if (request.userData.label === Labels.COUNT) {
        await countAllProducts({ body, stats });
        return;
      }
      const { document } = parseHTML(body.toString());
      if (request.userData.label === Labels.START) {
        const urls = document
          .querySelectorAll(
            "div.microsite-katalog ul.category-submenu > li > a"
          )
          .map(a => `${rootUrl}${a.getAttribute("href")}`);
        log.info(`${request.url} Found ${urls.length} categories`);
        await enqueueLinks({
          urls,
          userData: {
            label: Labels.CATEGORY
          }
        });
      }
      if (request.userData.label === Labels.CATEGORY) {
        // Add subcategories if this category has also products
        const subcategories = document.querySelectorAll(
          "div.subcategory-box-list .subcategoryWrapper a"
        );
        if (subcategories.length > 0) {
          const urls = subcategories.map(
            a => `${rootUrl}${a.getAttribute("href")}`
          );
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} subcategories`);
          await enqueueLinks({
            urls,
            userData: {
              label: Labels.CATEGORY
            }
          });
          return; // Nothing more we can do for this page
        }
        // Add categories if this page has only categories and no products
        const categoryTree = document.querySelectorAll(
          "div.category-tree-box-list a"
        );
        if (categoryTree.length > 0) {
          const urls = categoryTree.map(
            a => `${rootUrl}${a.getAttribute("href")}`
          );
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} categories`);
          await enqueueLinks({
            urls,
            userData: {
              label: Labels.CATEGORY
            }
          });
          return; // Nothing more we can do for this page
        }
        // No more categories and subcategories continue with find maxPaginationPage
        const lastPagination = getLastPageNumber(
          document.querySelectorAll("div.pagination-wrapper ul.pagination a")
        );
        const urls = [];
        for (let i = 2; i <= lastPagination; i++) {
          urls.push(`${request.url}?showPage&page=${i}&limit=16`);
        }
        stats.add("pages", urls.length);
        log.info(`${request.url} Adding ${urls.length} pagination pages`);
        await enqueueLinks({
          urls,
          userData: {
            label: Labels.CATEGORY_NEXT
          }
        });
      }
      if (
        request.userData.label === Labels.CATEGORY ||
        request.userData.label === Labels.CATEGORY_NEXT
      ) {
        const products = extractItems(document, rootUrl, country);
        const requests = [];
        for (const product of products) {
          const s3item = { ...product };
          // Keboola data structure fix
          delete product.inStock;
          if (!processedIds.has(product.itemId)) {
            processedIds.add(product.itemId);
            requests.push(Dataset.pushData(product), uploadToS3v2(s3, s3item));
            stats.inc("items");
          } else {
            stats.inc("itemsDuplicity");
          }
        }
        log.info(`${request.url} Found ${requests.length / 2} unique products`);
        await Promise.all(requests);
      }
      if (request.userData.label === Labels.BF) {
        log.info(`START BF ${request.url}`);
        const urls = document
          .querySelectorAll(".ms-category-box")
          .map(a => `${rootUrl}${a.getAttribute("href")}`);
        log.info(`Found ${urls.length} BF categories`);
        await enqueueLinks({
          urls,
          userData: {
            label: Labels.CATEGORY
          }
        });
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const request = startingRequest({ rootUrl, country, type });
  await crawler.run([request]);
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
