import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Actor, log, Dataset } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { gotScraping } from "got-scraping";
import { DOMParser, parseHTML } from "linkedom/cached";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Labels = {
  START: "START",
  COUNT: "COUNT",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

const rootCZ = "https://www.datart.cz";
const rootSK = "https://www.datart.sk";

export const parseXML = (xml, globals = null) =>
  new DOMParser().parseFromString(xml, "text/xml", globals).defaultView;

async function countAllProducts({ body, stats }) {
  const { document } = parseXML(body.toString());
  const productXmlUrls = document
    .querySelectorAll("sitemap loc")
    .map(loc => loc.innerText.trim());
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for (const xmlUrl of productXmlUrls) {
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
 * @param {Country} country
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
        itemUrl: `${rootUrl}${productHeader.href}`,
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
  if (type === ActorType.BlackFriday) {
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
  } else if (type === ActorType.Full) {
    return {
      url: `${rootUrl}/katalog`,
      userData: {
        label: Labels.START
      }
    };
  } else if (type === ActorType.Test && country === Country.CZ) {
    return {
      url: `https://www.datart.cz/televize.html`,
      userData: {
        label: Labels.CATEGORY
      }
    };
  } else if (type === ActorType.Test && country === Country.SK) {
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

  const {
    development,
    maxRequestRetries,
    proxyGroups = ["CZECH_LUMINATI"],
    country = Country.CZ,
    type = ActorType.Full
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0,
    blocked: 0
  });

  const rootUrl = country === Country.CZ ? rootCZ : rootSK;

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestsPerMinute: 200,
    sessionPoolOptions: {
      sessionOptions: {
        maxUsageCount: 200
      }
    },
    async requestHandler({
      request,
      log,
      body,
      enqueueLinks,
      session,
      crawler
    }) {
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
          .map(a => ({
            url: `${rootUrl}${a.href}`,
            userData: {
              label: Labels.CATEGORY
            }
          }));
        log.info(`${request.url} Found ${urls.length} categories`);
        await crawler.requestQueue.addRequests(urls, { forefront: true });
      }
      if (request.userData.label === Labels.CATEGORY) {
        // Add subcategories if this category has also products
        const subcategories = document.querySelectorAll(
          "div.subcategory-box-list .subcategoryWrapper a"
        );
        if (subcategories.length > 0) {
          const urls = subcategories.map(a => ({
            url: `${rootUrl}${a.href}`,
            userData: {
              label: Labels.CATEGORY
            }
          }));
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} subcategories`);
          await crawler.requestQueue.addRequests(urls, { forefront: true });
          return; // Nothing more we can do for this page
        }
        // Add categories if this page has only categories and no products
        const categoryTree = document.querySelectorAll(
          "div.category-tree-box-list a"
        );
        if (categoryTree.length > 0) {
          const urls = categoryTree.map(a => ({
            url: `${rootUrl}${a.href}`,
            userData: {
              label: Labels.CATEGORY
            }
          }));
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} categories`);
          await crawler.requestQueue.addRequests(urls, { forefront: true });
          return; // Nothing more we can do for this page
        }
        // No more categories and subcategories continue with find maxPaginationPage
        const lastPagination = getLastPageNumber(
          document.querySelectorAll("div.pagination-wrapper ul.pagination a")
        );
        const urls = restPageUrls(
          lastPagination,
          i => `${request.url}?showPage&page=${i}&limit=16`
        );
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
        await Dataset.pushData(products);
        if (!products.length && !document.querySelector("[data-webname]")) {
          log.warning("Looks like we are blocked");
          stats.inc("blocked");
          session.retire();
        }
        log.info(`${request.url} Found ${products.length} products`);
      }
      if (request.userData.label === Labels.BF) {
        log.info(`START BF ${request.url}`);
        const urls = document
          .querySelectorAll(".ms-category-box")
          .map(a => `${rootUrl}${a.href}`);
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
      stats.inc("failed");
    }
  });

  const request = startingRequest({ rootUrl, country, type });
  await crawler.run([request]);
  await stats.save(true);
  log.info("crawler finished");

  try {
    let tableName = "";

    if (type === ActorType.Full && country === "CZ") {
      tableName = "datart";
    } else if (type === ActorType.Full && country === "SK") {
      tableName = "datart_sk";
    } else if (type !== ActorType.Full && country === "CZ") {
      tableName = "datart_bf";
    } else if (type !== ActorType.Full && country === "SK") {
      tableName = "datart_sk_bf";
    }

    if (!development) {
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    }
  } catch (e) {
    log.error(e);
  }

  log.info("Finished.");
}

await Actor.main(main, { statusMessage: "DONE" });
