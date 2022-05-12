import Apify from "apify";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";

const { log } = Apify.utils;

const LABELS = {
  NAVIGATION: "NAVIGATION",
  CATEGORY: "CATEGORY",
  CATEGORY_CAT: "CATEGORY_CAT",
  COFFEE_CATEGORY: "COFFEE_CATEGORY",
  LIST: "LIST"
};

const coffeeCategories = new Set([
  "svet-kavy-c37.html",
  "kava-cely-sortiment-tchibo-prehledne-c400061792.html",
  "kava-zo-100-zrniek-arabica-dokonaly-pozitok-c400004921.html",
  "kaffeezubereiter-c400004285.html",
  "kaffee-zubehoer-c400004286.html",
  "kaffeegeschenke-c400004887.html",
  "kaffee-aus-100-arabica-bohnen-vollkommener-kaffeegenuss-bei-t-c39.html",
  "kawa-w-100-z-ziaren-arabiki-przyjemnosc-picia-kawy-z-tchibo-c32.html",
  "100-arabica-kavebabbol-keszult-kave-tokeletes-kaveelmeny-a-tc-c400004916.html",
  "tchibo-kahve-cesitleri-c400011809.html",
  "kaffee-aus-100-arabica-bohnen-vollkommener-kaffeegenuss-bei-t-c15.html"
]);

const ignoredCategories = new Set([
  "https://foto.tchibo.de/",
  "https://reisen.tchibo.de/",
  "aktionen-c400070426.html"
]);

function getCurrencyISO(country) {
  switch (country) {
    case "cz":
      return "CZK";
    case "sk":
    case "de":
    case "at":
      return "EUR";
    case "ch":
      return "CHF";
    case "pl":
      return "PLN";
    case "hu":
      return "HUF";
    case "com.tr":
      return "TRY";
    default:
      return null;
  }
}

function parsePrice(price, userInput) {
  const { country = "cz" } = userInput;
  let result = price.replace(/\s/, "").replace(",", ".");
  result = result.match(/[\d+|.]+/)[0];
  result = parseFloat(result);
  return country === "de" ? result / 100 : result;
}

function getCoffeeCategory(userInput) {
  const { country = "cz" } = userInput;
  switch (country) {
    case "cz":
      return "Káva";
    case "sk":
      return "Káva";
    case "de":
      return "Kaffee";
    case "ch":
      return "Kaffee";
    case "pl":
      return "Kawa";
    case "hu":
      return "Kávé";
    case "at":
      return "Kaffee";
    case "com.tr":
      return "Kahve";
  }
}

async function scrapeNavigation({ json, crawler }, { userInput }) {
  const { country = "cz" } = userInput;
  for (const { children } of json.list) {
    for (const { href } of children) {
      if (ignoredCategories.has(href)) continue;
      if (coffeeCategories.has(href)) {
        await crawler.requestQueue.addRequest({
          url: new URL(href, `https://www.tchibo.${country}/`).href,
          userData: {
            label: LABELS.COFFEE_CATEGORY
          }
        });
      } else {
        await crawler.requestQueue.addRequest({
          url: new URL(href, `https://www.tchibo.${country}/`).href,
          userData: {
            label: LABELS.CATEGORY
          }
        });
      }
    }
  }
}

async function scrapeCategory({ $, crawler }) {
  const menu = $(".c-tp-sidebarnavigation > ul > li > ul > li > a").toArray();
  for (const m of menu) {
    await crawler.requestQueue.addRequest({
      url: $(m).attr("href"),
      userData: {
        label: LABELS.CATEGORY_CAT
      }
    });
  }
}

async function scrapeCategoryCat({ $, crawler }) {
  const selectedCategory = $("a.active").parent().find("ul > li > a").toArray();
  for (const s of selectedCategory) {
    await crawler.requestQueue.addRequest({
      url: $(s).attr("href"),
      userData: {
        label: LABELS.LIST,
        page: 0
      }
    });
  }
}

async function scrapePagination($, pageNumber, crawler, url) {
  const searchResults = $(".searchResults");
  if (pageNumber !== 0) return;

  const finalCount = parseInt(searchResults.attr("data-result-count"), 10);
  if (finalCount <= 30) return;

  let page = 2;
  let productsCount = 0;
  while (productsCount < finalCount) {
    await crawler.requestQueue.addRequest({
      url: `${url}?page=${page}`,
      userData: {
        label: LABELS.LIST,
        page
      }
    });
    page += 1;
    productsCount += 30;
  }
}

async function scrapeListing(
  { request: { url, userData }, $, crawler },
  { s3, handledIdsSet, currency, userInput }
) {
  const { country = "cz" } = userInput;
  let { page } = userData;
  await scrapePagination($, page, crawler, url);
  const breadcrumbItems = $(".c-tp-breadcrumb-item > a").toArray();
  const productList = $("div[data-search-result-list-entry]").toArray();
  const promises = [];
  for (const product of productList) {
    const itemId = $(product).attr("data-product-id");
    if (handledIdsSet.has(itemId)) continue;
    handledIdsSet.add(itemId);
    const image = $(product).find(".m-tp-productbox002-image");
    const url = image.parent().attr("href");
    const itemName = image.attr("alt");
    const img = image.attr("data-src");
    const currentPrice = $(product)
      .find(".c-tp-price-currentprice")
      .text()
      .trim();
    const oldPrice = $(product).find(".c-tp-price-oldprice").text().trim();
    const result = {
      itemId,
      itemUrl: url,
      slug: itemSlug(url),
      itemName,
      img: `https://www.tchibo.${country}${img}`,
      discounted: false,
      originalPrice: null,
      currency,
      currentPrice: parsePrice(currentPrice, userInput),
      category: breadcrumbItems.map(p => $(p).text().trim()).join(" > ")
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice, userInput);
    }
    promises.push(
      Apify.pushData(result),
      uploadToS3v2(s3, result, {
        inStock: true,
        priceCurrency: result.currency
      })
    );
  }
  await Promise.all(promises);
}

async function scrapeCoffeeCategory(
  { $, crawler },
  { s3, handledIdsSet, currency, userInput }
) {
  const { country = "cz" } = userInput;
  const products = $(".m-tp-productbox002").toArray();
  let promises = [];
  for (const p of products) {
    const titleObject = $(p).find(".m-tp-productbox002-title");
    const itemId = titleObject.find("a").attr("data-pds-link");
    if (handledIdsSet.has(itemId)) continue;
    handledIdsSet.add(itemId);
    const title = titleObject.find("a").attr("title");
    const itemUrl = titleObject.find("a").attr("href");
    const topLineText = $(p)
      .find(".m-tp-productbox002-topline-text")
      .text()
      .trim();
    const name = titleObject.find("a > span").text().trim();
    const subName = $(p).find(".m-tp-productbox002-flavor").text().trim();
    const img = $(p).find(".m-tp-productbox002-image").attr("data-src");
    const currentPrice = $(p).find(".c-tp-price-currentprice").text().trim();
    const oldPrice = $(p).find(".c-tp-price-oldprice").text().trim();
    const result = {
      itemId,
      itemUrl,
      slug: itemSlug(itemUrl),
      itemName: `${topLineText ? `${topLineText} - ` : ""}${
        title ? `${title} - ` : ""
      }${name}${subName ? ` - ${subName}` : ""}`,
      img: `https://www.tchibo.${country}/${img}`,
      originalPrice: null,
      discounted: false,
      currency,
      currentPrice: parsePrice(currentPrice),
      category: getCoffeeCategory(userInput)
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parsePrice(oldPrice);
    }
    promises.push(
      Apify.pushData(result),
      uploadToS3v2(s3, result, {
        inStock: true,
        priceCurrency: result.currency
      })
    );
    if (promises.length > 40) {
      await Promise.all(promises);
      promises = [];
    }
  }
  await Promise.all(promises);
  const subCategories = $(
    ".m-coffee-categoryTeaser--tileWrapper > a, .m-coffee-teaser-slider > a"
  ).toArray();
  for (const sc of subCategories) {
    await crawler.requestQueue.addRequest({
      url: $(sc).attr("href"),
      userData: {
        label: LABELS.COFFEE_CATEGORY
      }
    });
  }
}

Apify.main(async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const userInput = await Apify.getInput();
  const { country } = userInput;
  const currency = getCurrencyISO(country);

  const requestQueue = await Apify.openRequestQueue();
  const requestList = await Apify.openRequestList("start-categories", [
    {
      url: `https://www.tchibo.${country}/jsonflyoutnavigation`,
      userData: {
        label: LABELS.NAVIGATION
      }
    }
  ]);

  const handledIds = (await Apify.getValue("HANDLED_PRODUCT_IDS")) || [];
  const handledIdsSet = new Set(handledIds);

  Apify.events.on("persistState", async () => {
    await Apify.setValue("handledIds", Array.from(handledIdsSet));
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    requestList,
    proxyConfiguration,
    maxConcurrency: 20,
    useSessionPool: true,
    async handlePageFunction(context) {
      const { request } = context;
      const { label } = request.userData;
      log.info(`Processing: [${label}] - [${request.url}]`);
      switch (label) {
        case LABELS.LIST:
          return scrapeListing(context, {
            s3,
            handledIdsSet,
            currency,
            userInput
          });
        case LABELS.CATEGORY:
          return scrapeCategory(context);
        case LABELS.NAVIGATION:
          return scrapeNavigation(context, { userInput });
        case LABELS.COFFEE_CATEGORY:
          return scrapeCoffeeCategory(context, {
            s3,
            handledIdsSet,
            currency,
            userInput
          });
        case LABELS.CATEGORY_CAT:
          return scrapeCategoryCat(context);
      }
    },
    // If request failed 4 times then this function is executed
    async handleFailedRequestFunction({ request }) {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.allSettled([
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", `tchibo.${country}`),
    uploadToKeboola(`tchibo_${country === "com.tr" ? "tr" : country}`)
  ]);
  log.info("invalidated Data CDN");
  log.info("Finished.");
});
