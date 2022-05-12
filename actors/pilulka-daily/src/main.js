import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { LABEL, COUNTRY, ROOT_WEB_URL } from "./const.js";
import { buildUrl } from "./tools.js";
import randomUA from "modern-random-ua";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";

const { log } = Apify.utils;

async function enqueuRequests(requestQueue, items) {
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}

// fetch links and names of categories
async function fetchCategories($, requestQueue, country, test) {
  let categories = [];
  $("#js-main-nav-box .js_level-2 a.main-nav__item__dropdown").each(
    function () {
      const link = $(this).attr("href");
      const category = [];
      category.push(
        $(this)
          .closest(".main-nav__item.js_level-1")
          .find("a.main-nav__item__dropdown")
          .first()
          .text()
          .trim()
      );
      category.push($(this).text().trim());

      categories.push({
        url: buildUrl(ROOT_WEB_URL(country), link),
        headers: { userAgent: randomUA.generate() },
        userData: { label: LABEL.CATEGORY, category }
      });
    }
  );
  if (categories.length === 0) {
    $("#js-main-nav-box .js_level-1 a.main-nav__item__dropdown").each(
      function () {
        const link = $(this).attr("href");
        const category = [];
        category.push($(this).text().trim());

        categories.push({
          url: buildUrl(ROOT_WEB_URL(country), link),
          headers: { userAgent: randomUA.generate() },
          userData: { label: LABEL.SUB_CATEGORY, category }
        });
      }
    );
  }

  if (test) {
    categories = categories.slice(0, 1);
    log.info("TEST run");
  }
  log.info(`Found ${categories.length} categories.`);
  await enqueuRequests(requestQueue, categories, false);
}

async function fetchSubCategories($, requestQueue, request, country) {
  const categories = [];
  $(".subcategories .subcategories__link").each(function () {
    const link = $(this).attr("href");
    const { category } = request.userData;
    category.push($(this).text().trim().split("\n")[0].trim());

    categories.push({
      url: buildUrl(ROOT_WEB_URL(country), link),
      headers: { userAgent: randomUA.generate() },
      userData: { label: LABEL.CATEGORY, category }
    });
  });
  log.info(`Found ${categories.length} categories.`);
  await enqueuRequests(requestQueue, categories, false);
}

// generate category pages
async function generateCategoryPages($, requestQueue, request) {
  let maxPage = 0;
  const pages = [];

  if ($("#pagination ul.pagination").length > 0) {
    maxPage = parseInt(
      $("#pagination ul.pagination li a.pagination__link").last().text(),
      10
    );
  }

  for (let i = 2; i <= maxPage; i++) {
    pages.push({
      url: `${request.url}?page=${i}`,
      headers: { userAgent: randomUA.generate() },
      userData: {
        label: LABEL.CATEGORY_PAGE,
        category: request.userData.category
      }
    });
  }
  log.info(
    `Found ${pages.length} pages for category ${request.userData.category}.`
  );
  await enqueuRequests(requestQueue, pages, false);
}

function parsePrice(text, country) {
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
    item.data("event") === "ProductTopCategory"
      ? ".top-product__add-to-cart--container a s.text-gray"
      : ".product-prev__price-discount";
  return parsePrice(item.find(selector).text(), country);
}

// fetch product base info from category page
async function fetchProductBase(
  crawlContext,
  $,
  requestQueue,
  request,
  country,
  type,
  s3
) {
  const productsCards =
    type === ActorType.BF
      ? $(".product-prev__content")
      : $(".product-cards, .top-product-cards").find(".product-prev__content");

  const products = await Promise.allSettled(
    productsCards.map(async function () {
      try {
        const item = $(this);
        const name = item.find("picture img").attr("alt");
        const id = item.find('form input[name="productId"]').val();
        const link = item.find("a.product-prev__title").attr("href");
        const imgLink = item.find("picture img").data("src");
        const shortDesc = item.find(".product-prev__description").text().trim();
        const availability = item
          .find(".js-trigger-availability-modal span")
          .first()
          .text()
          .trim();
        const currentPrice = parsePrice(
          item.find(".js-trigger-availability-modal").data("product-price")
        );

        if (
          Number.isNaN(currentPrice) ||
          currentPrice <= 0 ||
          id === undefined
        ) {
          log.info(`Skip product without price [${name}]`);
        } else {
          let originalPrice = getOriginalPrice(item, country);

          const itemUrl = buildUrl(ROOT_WEB_URL(country), link);
          const isDiscounted =
            !Number.isNaN(originalPrice) && originalPrice > 0;

          return {
            itemId: id,
            itemName: name,
            itemUrl: itemUrl,
            shop: shopName(itemUrl),
            slug: itemSlug(itemUrl),
            img: buildUrl(ROOT_WEB_URL(country), imgLink),
            shortDesc,
            availability,
            category: request.userData.category,
            originalPrice: isDiscounted ? originalPrice : null,
            currentPrice,
            discounted: isDiscounted
          };
        }
      } catch (e) {
        log.error(`Products extraction failed on url: ${request.url}`);
        log.error(e.message);
      }
    })
  );
  // we don't need to block pushes, we will await them all at the end
  const allFulfilledProducts = products
    .filter(p => p.status === "fulfilled")
    .map(p => p.value);
  const requests = [Apify.pushData(allFulfilledProducts)];
  if (!crawlContext.development) {
    for (const product of allFulfilledProducts) {
      requests.push(
        uploadToS3v2(s3, product, {
          priceCurrency: country === COUNTRY.CZ ? "CZK" : "EUR",
          inStock: true
        })
      );
    }
  }
  console.log(`Found ${allFulfilledProducts.length} products`);
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);
}

// fetch product details URLs
async function fetchProductUrl($, requestQueue, request) {
  await Apify.utils.enqueueLinks({
    $,
    requestQueue,
    selector:
      ".product-cards a.product-prev__title, .top-product-cards a.product-prev__title",
    baseUrl: request.loadedUrl,
    transformRequestFunction: req => {
      req.userData = request.userData;
      req.userData.label = LABEL.PRODUCT_DETAIL;
      req.headers = { userAgent: randomUA.generate() };
      return req;
    }
  });
}

// fetch details from each product detail page
async function fetchProductDetail($, requestQueue, request, country, s3) {
  const result = {};

  try {
    const currentPrice = parseFloat(
      $("form.js-amount-add").data("at-product-price").replace(/\s/g, "")
    );
    const originalPrice = parseFloat(
      $("#js-product-layer-pc .product-layer__grid-old-price")
        .text()
        .replace(/\s/g, "")
    );
    const detailTable = $("#product-info .product-detail__table");

    result.img = buildUrl(
      ROOT_WEB_URL(country),
      $(".product-detail__images picture img").data("src")
    );
    result.itemId = $('form input[name="productId"]').val();
    result.itemUrl = request.url;
    result.itemName = $("h1.product-detail__main-heading").text().trim();
    result.shortDesc = $(".product-detail__reduced > div > div > p")
      .text()
      .trim();
    result.availability = $('div[data-event="ProductDetailMaster"] > strong')
      .text()
      .trim();
    result.sukl = detailTable
      .find('tr:contains("SUKL kód:") td:nth-child(2)')
      .text()
      .trim();
    result.ean = detailTable
      .find('tr:contains("EAN:") td:nth-child(2)')
      .text()
      .trim();
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

      await uploadToS3v2(s3, result, {
        priceCurrency: country === COUNTRY.CZ ? "CZK" : "EUR",
        inStock: true
      });

      await Apify.pushData(result);
    } else {
      log.info(`Skip non price product [${result.itemName}]`);
    }
  } catch (e) {
    log.error(`Product extraction failed on url: ${request.url}`);
  }
}

function parseProducts(
  $,
  requestQueue,
  request,
  crawlContext,
  country,
  type,
  parseDetails,
  s3
) {
  if (parseDetails) {
    return fetchProductUrl($, requestQueue, request);
  }
  return fetchProductBase(
    crawlContext,
    $,
    requestQueue,
    request,
    country,
    type,
    s3
  );
}

Apify.main(async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    test = false,
    country = COUNTRY.CZ,
    maxRequestRetries = 4,
    maxConcurrency = 20,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrls = ["https://www.pilulka.cz/black-friday-2021"]
  } = input ?? {};

  const requestQueue = await Apify.openRequestQueue();

  const crawlContext = {
    development
  };

  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  if (type === ActorType.BF) {
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url,
        headers: { userAgent: randomUA.generate() },
        userData: { label: LABEL.CATEGORY_PAGE }
      });
    }
  } else {
    await requestQueue.addRequest({
      url: ROOT_WEB_URL(country),
      headers: { userAgent: randomUA.generate() },
      userData: { label: LABEL.START }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  // Create crawler
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    proxyConfiguration,
    handlePageFunction: async ({ $, request }) => {
      switch (request.userData.label) {
        case LABEL.START:
          log.info(
            `START scraping pilulka.${country.toLowerCase()} type=${type} test=${test}`
          );
          await fetchCategories($, requestQueue, country, test);
          break;
        case LABEL.SUB_CATEGORY:
          log.info(`START with sub_category ${request.url}`);
          await fetchSubCategories($, requestQueue, request, country);
          break;
        case LABEL.CATEGORY:
          log.info(`START with category ${request.url}`);
          await generateCategoryPages($, requestQueue, request);
          await parseProducts(
            $,
            requestQueue,
            request,
            crawlContext,
            country,
            type,
            input.parseDetails,
            s3
          );
          break;
        case LABEL.CATEGORY_PAGE:
          await parseProducts(
            $,
            requestQueue,
            request,
            crawlContext,
            country,
            type,
            input.parseDetails,
            s3
          );
          break;
        case LABEL.PRODUCT_DETAIL:
          await fetchProductDetail(
            crawlContext,
            $,
            requestQueue,
            request,
            country,
            s3
          );
          break;
      }
    },
    // If request failed 10 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });

  // Run crawler
  await crawler.run();

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `pilulka.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    let tableName = country === COUNTRY.CZ ? "pilulka_cz" : "pilulka_sk";
    if (type === ActorType.BF) {
      tableName = `${tableName}_bf`;
    }

    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("Finished.");
});
