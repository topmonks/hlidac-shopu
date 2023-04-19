import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, Dataset, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { gotScraping } from "got-scraping";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { PlaywrightCrawler } from "@crawlee/playwright";

/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

const urlBase = "https://www.electroworld.cz";

const mainBodyToken = "#snippet--pdbox";

const productItemToken = "div.product-list section.product-box";
const categoryToken = ".subcategories section";
const pagingToken = ".pagination .page-item";

const productRatingToken = "p.product-box__rating span.sr-only";
const productNameToken = ".product-box__link";
const productPricesToken = ".product-box__price-bundle";
const productPriceOriginalToken = ".product-box__price-bundle del";
const productPriceToken = ".product-box__price-bundle strong";
const productLinkToken = "a.product-box__link";
const productImgToken = ".product-box__img-box img";
const productAvailability =
  ".product-box__availability a span.complex-link__underline";

/**
 * @param {Document} document
 */
async function scrapeProductListPage(document) {
  const requests = [];
  const categories = [];
  const categoryScriptElement = document.querySelector(
    'script[type="application/ld+json"]'
  );
  const jsonCategoriesData = categoryScriptElement
    ? JSON.parse(categoryScriptElement.textContent)
    : null;
  if (jsonCategoriesData) {
    jsonCategoriesData.itemListElement.forEach(obj => {
      if (obj.position > 1) {
        categories.push(obj.name);
      }
    });
  }

  const products = document.querySelectorAll(productItemToken);
  for (const topElement of products) {
    const product = {};

    product.itemId = topElement.querySelector("h3").getAttribute("product-id");
    product.itemName = topElement
      .querySelector(productNameToken)
      .innerText.trim()
      .replace(new RegExp(String.fromCharCode(160), ""), "");
    product.itemUrl = `${urlBase}${
      topElement.querySelector(productLinkToken).href
    }`;
    product.img = topElement.querySelector(productImgToken).getAttribute("src");
    product.currentPrice = cleanPrice(
      topElement.querySelector(productPriceToken)?.innerText
    );

    const isCashback = topElement
      .querySelector(productPricesToken)
      .innerText.trim();
    if (isCashback.includes("Cena s")) {
      // If product use cashback or sale coupon, there is missing possible sale price and need scrap detail of product via api
      const response = await gotScraping({
        responseType: "json",
        url: `https://www.electroworld.cz/api/eshop/product-boxes?id[]=${product.itemId}`
      });
      const { statusCode, body } = response;
      if (statusCode !== 200) {
        return log.info(body.toString());
      }
      const oldPrice = body.productBoxes[0].priceBundle.oldPrice;
      product.originalPrice = oldPrice ? parseFloat(oldPrice.amount) : null;
    } else if (isCashback.includes("Ušetříte")) {
      const salePrice = cleanPrice(
        topElement
          .querySelectorAll(".product-box__price-bundle .typo-complex-16")
          .at(-1)
          .innerText.trim()
      );
      product.originalPrice = product.currentPrice + salePrice;
    } else {
      const productPriceOriginal = topElement.querySelector(
        productPriceOriginalToken
      )?.innerText;
      product.originalPrice = cleanPrice(productPriceOriginal);
    }

    product.currency = "CZK";
    product.category = categories;

    const ratingStr = topElement
      .querySelector(productRatingToken)
      ?.innerText?.trim()
      ?.replace("Hodnocení: ", "")
      ?.replace(", počet hodnocení:", "")
      ?.split(" z ");
    const rating =
      ratingStr?.length === 2
        ? (parseFloat(ratingStr[0]) / parseFloat(ratingStr[1])) * 100
        : null;
    // String casting is according to the spec o.0
    // https://docs.google.com/document/d/1qIwqARBTDSnkUrFItE1ZJZF1svLIYj3lD8fr82HUMtk/edit#
    product.rating = String(rating);

    // In case of this eshop, this could be done during data processing
    product.discounted =
      (product.originalPrice !== -1 || product.originalPrice !== null) &&
      product.originalPrice > product.currentPrice;

    product.available =
      topElement
        .querySelector(productAvailability)
        ?.innerText?.includes("Skladem") ?? false;

    product.sale = null;
    if (product.currentPrice !== null && product.originalPrice !== null) {
      product.sale = 1 - product.currentPrice / product.originalPrice;
    }
    requests.push(product);
  }
  log.info(`Found ${requests.length / 2} unique products`);
  return requests;
}

async function saveProducts(products, stats, processedIds) {
  const requests = [];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(Dataset.pushData(product));
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  await Promise.all(requests);
}

/**
 * @param {Document} document
 */
function subCategoryRequest(document) {
  return document.querySelectorAll(categoryToken).map(cat => {
    const link = cat.querySelector("a");
    const categoryUrl = `${urlBase}${link.href}`;
    return { url: categoryUrl };
  });
}

/**
 * @param {Document} document
 * @param {string} firstPageURL
 */
function productListRequests(document, firstPageURL) {
  const pages = document.querySelectorAll(pagingToken);
  if (pages.length === 0) return [];

  const maxPages = Number(pages.at(-2).innerText) + 1;
  return restPageUrls(maxPages, i => {
    const url = `${firstPageURL}?page=${i}`;
    log.info(`Adding page ${url} to queue.`);
    return {
      userData: { label: "nthPage", pageN: i },
      url
    };
  });
}

async function handlePage({
  document,
  crawler,
  request,
  stats,
  type,
  processedIds
}) {
  if (request.userData.label === "nthPage") {
    log.info(
      `Scraping ${request.userData.pageN} product list page: ${request.url}`
    );
    const products = await scrapeProductListPage(document);
    await saveProducts(products, stats, processedIds);
  } else {
    const productElements = document.querySelectorAll(productItemToken);
    const isSubCategoryPage = productElements.length === 0;

    if (isSubCategoryPage && type !== "BF") {
      log.info(`Found new subcategory page: ${request.url}`);
      const requests = subCategoryRequest(document);
      await crawler.requestQueue.addRequests(requests);
      stats.inc("categories");
    } else {
      log.info(`Scraping 1st product list page: ${request.url}`);
      const requests = productListRequests(document, request.url);
      await crawler.requestQueue.addRequests(requests);
      const products = await scrapeProductListPage(document);
      await saveProducts(products, stats, processedIds);
    }
  }
  stats.inc("pages");
}

/**
 * @param {Document} document
 */
function mkBreadcrumbsList(document) {
  const categories = [];
  const categoriesArr = document.querySelector(
    ".breadcrumb__list.l-in-box.u-maw-1310px.ol--reset"
  ).children;
  for (const i of categoriesArr) {
    if (i > 0) {
      categories.push(
        document
          .querySelector(categoriesArr[i])
          .querySelector("a > span")
          .innerText.replace(new RegExp(String.fromCharCode(160), ""))
      );
    }
  }
  return categories;
}

/**
 * @param {Document} document
 */
function mkImages(document) {
  const images = document
    .querySelectorAll("#product-other-imgs a")
    .map(e => e.href);
  return images.slice(0, images.length - 1);
}

/**
 * @param {string | number} str
 * @param {string} ratingStr
 */
function stripVoteCountStr(str, ratingStr) {
  return [/%0A/g, /%09/g, /%97/g, /%C3/g, `${ratingStr}%`]
    .reduce((acc, s) => acc.replace(s, ""), encodeURIComponent(str))
    .substr(2);
}

/**
 * @param {Document} document
 */
function mkRating(document) {
  let ratingStr = document
    .querySelector(".rating-stars__percents")
    .innerText.trim()
    .split("%")[0];
  let rating = -1;
  let voteCount = 0;
  if (ratingStr !== "") {
    ratingStr = ratingStr.split("%")[0];
    rating = Number(ratingStr) / 100;
    voteCount = document.querySelector(".product-top__rating").innerText.trim();
    voteCount = stripVoteCountStr(voteCount, ratingStr);
  }
  return { value: rating, count: voteCount };
}

function mkProperty(name, value) {
  return {
    "@type": "PropertyValue",
    name,
    value
  };
}

/**
 * @param {Document} document
 */
function mkProperties(document) {
  const properties = [];
  const baseParams = document.querySelectorAll(
    ".product-params__main-wrap > ul li"
  );
  for (const el of baseParams) {
    const p = el.querySelector("div > div");
    properties.push(
      mkProperty(
        p.querySelector("span").innerText,
        p.querySelector("strong").innerText
      )
    );
  }

  const otherParams = document.querySelectorAll(".ca-box tbody");
  for (const el of otherParams) {
    const trs = el.querySelectorAll("tr");
    trs.each(tr => {
      properties.push(
        mkProperty(
          tr.querySelector("th").innerText,
          tr.querySelector("td").innerText
        )
      );
    });
  }

  return properties;
}

function fetchDetail(document, request) {
  const json = JSON.parse(
    document.querySelector("#snippet-productRichSnippet-richSnippet")
      .textContent
  );

  const rating = mkRating(document);
  const images = mkImages(document);
  if (images.length === 0) {
    images.push(json.offers.image);
  }

  return {
    "@context": "http://schema.org",
    "@type": "itemPage",
    "identifier": json.identifier,
    "url": request.url,
    "breadcrumbs": {
      "@context": "http://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": mkBreadcrumbsList(document)
    },
    "mainEntity": {
      "@context": "http://schema.org",
      "@type": "Product",
      "name": json.name,
      "description": json.description,
      images,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating.value,
        "ratingCount": rating.count
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": json.offers.priceCurrency,
        "price": json.price,
        "url": json.offers.url,
        "itemCondition": "http://schema.org/NewCondition",
        "availability": "http://schema.org/InStock"
      },
      "brand": json.brand.name,
      "sku": json.sku,
      "mpn": null,
      "gtin13": json.gtin13,
      "category": json.offers.category,
      "additionalProperty": mkProperties(document),
      "mainContentOfPage": [
        {
          "@type": "WebPageElement",
          "cssSelector": mainBodyToken,
          "encodingFormat": "text/html",
          "encoding": document.querySelector(mainBodyToken).innerText
        }
      ]
    }
  };
}

/**
 * @param {Stats} stats
 */
async function countProducts(stats) {
  const { body } = await gotScraping({
    url: `${urlBase}/sitemap.xml`
  });
  const { document } = parseXML(body);
  const productXmlUrls = [];

  for (const loc of document.querySelectorAll("sitemap loc")) {
    const url = loc.innerText.trim();
    if (url.includes("products")) {
      productXmlUrls.push(url);
    }
  }
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for (const xmlUrl of productXmlUrls) {
    const { body } = await gotScraping({
      url: xmlUrl
    });
    const { document } = parseXML(body);
    stats.add("items", document.querySelectorAll("url").length);
  }
  log.info(`Total items ${stats.get().items}x`);
}

async function main() {
  rollbar.init();
  const processedIds = new Set();
  const {
    development,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full,
    startUrls = [
      "https://www.electroworld.cz/smart-inteligentni-domacnost",
      "https://www.electroworld.cz/televize-foto-audio-video",
      "https://www.electroworld.cz/mobily-notebooky-tablety-pc-gaming",
      "https://www.electroworld.cz/velke-spotrebice-chladnicky-pracky",
      "https://www.electroworld.cz/male-spotrebice-vysavace-kavovary",
      "https://www.electroworld.cz/zahrada-dum-sport-hobby"
    ],
    detailURLs = [
      "https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy",
      "https://www.electroworld.cz/nine-eagles-galaxy-visitor-3",
      "https://www.electroworld.cz/samsung-galaxy-a52-128-gb-cerna"
    ],
    bfUrls = ["https://www.electroworld.cz/blackfriday-2021/sort-by_cheapest"]
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler =
    type === ActorType.BlackFriday
      ? new PlaywrightCrawler({
          proxyConfiguration,
          maxRequestsPerMinute: 600,
          maxRequestRetries,
          navigationTimeoutSecs: 120,
          launchContext: {
            useChrome: true,
            launchOptions: {
              headless: true
            }
          },
          async requestHandler({ request, page }) {
            await page.waitForSelector(".product-box__price-bundle");
            await page.waitForSelector("ul.pagination");
            const text = await page.content();
            const { document } = parseHTML(text);
            await handlePage({
              document,
              crawler,
              request,
              stats,
              type,
              processedIds
            });
          },
          async failedRequestHandler({ request }, error) {
            log.error(`Request ${request.url} failed multiple times`, error);
            stats.inc("failed");
          }
        })
      : new HttpCrawler({
          proxyConfiguration,
          maxRequestsPerMinute: 600,
          maxRequestRetries,
          async requestHandler({ body, request }) {
            const { document } = parseHTML(body.toString());
            if (type === ActorType.Full || type === "TEST_FULL") {
              await handlePage({
                document,
                crawler,
                request,
                stats,
                type,
                processedIds
              });
            } else if (type === "DETAIL") {
              const detail = fetchDetail(document, request);
              await Dataset.pushData(detail);
            }
          },
          async failedRequestHandler({ request }, error) {
            log.error(`Request ${request.url} failed multiple times`, error);
            stats.inc("failed");
          }
        });

  log.info("Starting the crawl.");
  const startingRequests = [];
  if (type === ActorType.Full) {
    for (const startUrl of startUrls) {
      startingRequests.push({ url: startUrl });
    }
  } else if (type === "DETAIL") {
    for (const detailUrl of detailURLs) {
      startingRequests.push({ url: detailUrl });
    }
  } else if (type === "COUNT") {
    await countProducts(stats);
  } else if (type === "TEST_FULL") {
    startingRequests.push({
      userData: { label: "nthPage", pageN: 0 },
      url: "https://www.electroworld.cz/smart-televize?p5%5B43814%5D=hisense"
    });
  } else if (type === ActorType.BlackFriday) {
    for (const bfUrl of bfUrls) {
      startingRequests.push({ url: bfUrl });
    }
  }
  await crawler.run(startingRequests);

  stats.save(true);

  log.info("crawler finished");

  if (!development) {
    await uploadToKeboola(
      type === ActorType.BlackFriday ? "electroworld_cz_bf" : "electroworld_cz"
    );
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main);
