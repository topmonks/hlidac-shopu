import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import cheerio from "cheerio";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const { log, requestAsBrowser } = Apify.utils;
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

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function countAllProducts(rootUrl, stats) {
  const stream = await requestAsBrowser({
    url: `${rootUrl}/sitemap/sitemapindex.xml`,
    stream: true
  });
  const buffer = await streamToBuffer(stream);
  const xmlString = buffer.toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const productXmlUrls = [];

  // Pick all product xml urls from sitemap
  $("sitemap").each(function () {
    const url = $(this).find("loc").text().trim();
    productXmlUrls.push(url);
  });
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for await (const xmlUrl of productXmlUrls) {
    const stream = await requestAsBrowser({
      url: xmlUrl,
      stream: true
    });
    const buffer = await streamToBuffer(stream);
    const xmlString = buffer.toString();
    const $ = cheerio.load(xmlString, { xmlMode: true });
    let readyForProductsLink = false;
    $("url").each(function () {
      const priority = $(this).find("priority").text().trim();
      //Will count only products link with priority "0.9" starting after category links with priority "0.5"
      if (priority === "0.9" && readyForProductsLink) {
        stats.items++;
      } else if (priority === "0.5" && !readyForProductsLink) {
        readyForProductsLink = true;
      }
    });
  }
  log.info(`Total items ${stats.items}x`);
}

/**
 *
 * @param {Cheerio} $
 * @param {String} rootUrl
 * @param {COUNTRY.CZ|COUNTRY.SK} country
 * @returns {Promise<[]>}
 */
async function extractItems($, rootUrl, country) {
  const itemsArray = [];
  // products
  const productElements = $("div.product-box-list div.product-box");
  if (productElements.length > 0) {
    const categoryArr = [];
    $("ol.breadcrumb > li > a").each(function () {
      categoryArr.push($(this).text().trim());
    });

    productElements.each(function () {
      if ($(this).attr("data-track")) {
        const result = {};
        const productBoxBuyInfoDelivery = $(this).find(
          "div.product-box-buy-info > div.product-box-buy-info-delivery span.color-text-red"
        );
        result.inStock = !productBoxBuyInfoDelivery.length > 0;

        const productBoxBuyInfoCart = $(this).find(
          "div.product-box-buy-info > div.product-box-buy-info-cart"
        );
        const itemCartDataTarget = productBoxBuyInfoCart
          .find("div.item-link-compare > button")
          .attr("data-target-add");
        if (itemCartDataTarget.length > 1) {
          const searchParams = new URLSearchParams(itemCartDataTarget);
          result.itemId = searchParams.get("id");
        }
        const productBoxTopSide = $(this).find("div.product-box-top-side");
        const productHeader = productBoxTopSide.find(
          "div.item-title-holder h3.item-title a"
        );
        result.itemName = productHeader.text().trim();
        result.itemUrl = rootUrl + productHeader.attr("href");

        result.img = productBoxTopSide
          .find("div.item-thumbnail img")
          .attr("src");

        result.currentPrice = productBoxBuyInfoCart
          .find("div.item-price span.actual")
          .text()
          .trim()
          .replace(/[^\d,]+/g, "")
          .replace(",", ".");
        const cutPrice = productBoxBuyInfoCart.find(
          "div.item-price span.cut-price del"
        );

        if (cutPrice.length > 0) {
          result.originalPrice = cutPrice
            .text()
            .trim()
            .replace(/[^\d,]+/g, "")
            .replace(",", ".");
          result.discounted = true;
        } else {
          result.originalPrice = null;
          result.discounted = false;
        }
        result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";

        result.category = categoryArr;

        itemsArray.push(result);
      }
    });
  }
  return itemsArray;
}

async function enqueuRequests(requestQueu, items) {
  for (const item of items) {
    await requestQueu.addRequest(item);
  }
}

Apify.main(async function main() {
  rollbar.init();
  let stats = {};
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = COUNTRY.CZ,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();
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

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    // Activates the Session pool.
    useSessionPool: true,
    // Overrides default Session pool configuration.
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    handlePageFunction: async ({ request, $, session, response }) => {
      if (response.statusCode !== 200) {
        session.retire();
      }
      // Process START page
      if (request.userData.label === LABELS.START) {
        const items = [];
        $("div.microsite-katalog")
          .find("ul.category-submenu > li > a")
          .each(function () {
            const link = $(this).attr("href");
            //console.log(`${rootUrl}${link}`);
            items.push({
              url: `${rootUrl}${link}`,
              userData: {
                label: LABELS.CATEGORY,
                uniqueKey: Math.random()
              }
            });
          });
        console.log(`${request.url} Found ${items.length} categories`);
        await enqueuRequests(requestQueue, items);
      }
      // Process CATEGORY page
      if (request.userData.label === LABELS.CATEGORY) {
        try {
          // Add subcategories if this category has also products
          const subcategories = $(
            "div.subcategory-box-list .subcategoryWrapper"
          ).find("a");
          if (subcategories.length > 0) {
            const items = [];
            subcategories.each(function () {
              const link = $(this).attr("href");
              items.push({
                url: `${rootUrl}${link}`,
                userData: {
                  label: LABELS.CATEGORY,
                  uniqueKey: Math.random()
                }
              });
            });
            stats.categories += items.length;
            console.log(`${request.url} Found ${items.length} subcategories`);
            await enqueuRequests(requestQueue, items);
            return; // Nothing more we can do for this page
          }
          // Add categories if this page has only categories and no products
          const categoryTree = $("div.category-tree-box-list").find("a");
          if (categoryTree.length > 0) {
            const categories = [];
            categoryTree.each(function () {
              const link = $(this).attr("href");
              categories.push({
                url: `${rootUrl}${link}`,
                userData: {
                  label: LABELS.CATEGORY,
                  uniqueKey: Math.random()
                }
              });
            });
            stats.categories += categories.length;
            console.log(`${request.url} Found ${categories.length} categories`);
            await enqueuRequests(requestQueue, categories);
            return; // Nothing more we can do for this page
          }
          //No more categories and subcategories continue with find maxPaginationPage
          let lastPagination = 0;
          $("div.category-actions ul.pagination")
            .find("a")
            .each(function () {
              const page = parseInt($(this).text());
              if (page > lastPagination) {
                lastPagination = page;
              }
            });
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
            //console.log(`${request.url}?showPage&page=${i}&limit=16`);
          }
          stats.pages += items.length;
          console.log(`${request.url} Adding ${items.length} pagination pages`);
          await enqueuRequests(requestQueue, items);
        } catch (e) {
          console.log(`Error processing url ${request.url}`);
          console.error(e);
        }
      }

      // Extract products from category page
      if (
        request.userData.label === LABELS.CATEGORY ||
        request.userData.label === LABELS.CATEGORY_NEXT
      ) {
        try {
          const products = await extractItems($, rootUrl, country);
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          for (const product of products) {
            const s3item = { ...product };
            //Keboola data structure fix
            delete product.inStock;
            // Save data to dataset
            if (!processedIds.has(product.itemId)) {
              processedIds.add(product.itemId);
              requests.push(Apify.pushData(product), uploadToS3v2(s3, s3item));
              stats.items++;
            } else {
              stats.itemsDuplicity++;
            }
          }
          console.log(
            `${request.url} Found ${requests.length / 2} unique products`
          );
          // await all requests, so we don't end before they end
          await Promise.all(requests);
        } catch (e) {
          console.log(`Failed to get products from page ${request.url}`);
          await Apify.pushData({
            status: "Failed to get products",
            url: request.url
          });
        }
      }

      if (request.userData.label === LABELS.BF) {
        log.info(`START BF ${request.url}`);
        const categories = [];
        $(".ms-category-box").each(function () {
          categories.push({
            url: `${rootUrl}${$(this).attr("href")}`,
            userData: {
              label: LABELS.CATEGORY
            }
          });
        });
        log.info(`Found ${categories.length} BF categories`);
        await enqueuRequests(requestQueue, categories);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed multiple times`);
    }
  });

  // Run crawler.
  await crawler.run();

  console.log("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

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
    console.log(e);
  }

  console.log("Finished.");
});
