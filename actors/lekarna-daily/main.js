import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import zlib from "zlib";
import cheerio from "cheerio";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const s3 = new S3Client({ region: "eu-central-1" });
const { log, requestAsBrowser } = Apify.utils;
const web = "https://www.lekarna.cz";
const SITEMAP_URL = "https://www.lekarna.cz/sitemap.xml";
const SITEMAP_CATEGORY_URL = "https://www.lekarna.cz/feed/sitemap/category";
let stats = {};
const processedIds = new Set();

async function enqueueRequests(requestQueue, items) {
  log.info(
    `Waiting for ${items.length} categories add to request queue. It will takes some time.`
  );
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function countAllProducts() {
  const stream = await requestAsBrowser({
    url: SITEMAP_URL,
    stream: true
  });
  const buffer = await streamToBuffer(stream);
  const xmlString = buffer.toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const productXmlUrls = [];

  // Pick all product xml urls from sitemap
  $("sitemap").each(function () {
    const url = $(this).find("loc").text().trim();
    if (url.includes("product")) productXmlUrls.push(url);
  });
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  let totalProducts = 0;
  for await (const xmlUrl of productXmlUrls) {
    const stream = await requestAsBrowser({
      url: xmlUrl,
      stream: true
    });
    const buffer = await streamToBuffer(stream);
    const xmlString = zlib.unzipSync(buffer).toString();
    const $ = cheerio.load(xmlString, { xmlMode: true });
    $("url").each(function () {
      totalProducts++;
    });
  }
  log.info(`Total items ${totalProducts}x`);
}

async function enqueueAllCategories(requestQueue) {
  const stream = await requestAsBrowser({
    url: SITEMAP_CATEGORY_URL,
    stream: true
  });
  const buffer = await streamToBuffer(stream);
  const xmlString = zlib.unzipSync(buffer).toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const categoryUrls = [];

  // Pick all urls from sitemap
  $("url").each(function () {
    const url = $(this).find("loc").text().trim();
    categoryUrls.push({
      url,
      userData: {
        label: "PAGE",
        baseUrl: url
      }
    });
    stats.urls++;
  });
  await enqueueRequests(requestQueue, categoryUrls);
  log.info(`Enqueued ${categoryUrls.length} categories`);
}

async function extractItems($, $products, breadCrumbs) {
  const itemsArray = [];
  $products.each(async function () {
    const result = {};
    const $item = $(this);
    const itemUrl = $item.find("meta[itemprop=url]").attr("content");
    const name = $item.find("h2").text().trim();
    const cartBut = $item.find('input[name="productSkuId"]');
    let id;
    if (cartBut.length !== 0) {
      id = cartBut.attr("value");
    } else if ($item.find("a[data-gtm]").length !== 0) {
      const itemJsonObject = JSON.parse(
        $item.find("a[data-gtm]").attr("data-gtm")
      );
      const products =
        itemJsonObject.ecommerce.click &&
        itemJsonObject.ecommerce.click.products
          ? itemJsonObject.ecommerce.click.products
          : [];
      const filtredProducts = products.filter(item =>
        item.variant.indexOf("Dlouhodobě nedostupný")
      );
      id = filtredProducts.length !== 0 ? filtredProducts[0].id : null;
    }

    const $actualPriceSpan = $item.find("span[itemprop=price]");
    const $oldPriceSpan = $item.find("span.text-gray-500.line-through");

    if ($actualPriceSpan.length > 0) {
      const itemImgUrl = $item.find("picture source").last().attr("srcset");
      result.itemId = id;
      result.itemName = name;
      result.itemUrl = itemUrl;
      result.img = itemImgUrl;
      result.category = breadCrumbs;
      result.currentPrice = parseFloat($actualPriceSpan.attr("content"));
      result.currency = $item
        .find("span[itemprop=priceCurrency]")
        .attr("content");
      if ($oldPriceSpan.length > 0) {
        result.originalPrice = parseFloat(
          $oldPriceSpan.text().replace("Kč", "").replace(/\s/g, "").trim()
        );
        result.discounted = true;
      } else {
        result.originalPrice = null;
        result.discounted = false;
      }
      itemsArray.push(result);
    } else {
      //Skipped itemprop="itemListElement" that's note product
      stats.itemsSkipped++;
    }
  });
  return itemsArray;
}

async function extractBfItems($, $products, breadCrumbs) {
  const itemsArray = [];
  $products.each(async function () {
    const result = {};
    const $item = $(this);
    const itemHeader = $item.find("h2 a");
    const itemOriginalPrice = $item.find("p.items-center span.line-through");
    const originalPrice = itemOriginalPrice
      ? parseFloat(
          itemOriginalPrice.text().replace("Kč", "").replace(/\s/g, "").trim()
        )
      : null;
    const itemJsonObject = JSON.parse(itemHeader.attr("data-datalayer"));
    const itemJson = itemJsonObject.ecommerce.products[0];
    const currentPrice = parseFloat(itemJson.price);
    const itemUrl = itemHeader.attr("href");

    const itemImgUrl = $item.find("picture img").attr("src");

    if (parseFloat(itemJson.price) > 0) {
      result.itemId = itemJson.id;
      result.itemName = itemJson.name;
      result.itemUrl = `https://lekarna.cz/${itemUrl}`;
      result.img = itemImgUrl;
      result.category = itemJson.categories;
      result.currentPrice = currentPrice;
      result.originalPrice = originalPrice;
      result.discounted = originalPrice > currentPrice;
      result.currency = "CZK";
      result.inStock = itemJson.availability === "InStock";
      itemsArray.push(result);
    } else {
      log.info(`Skipp non price product [${name}]`);
      stats.itemsSkipped++;
    }
  });
  return itemsArray;
}

async function handleStart($, requestQueue) {
  const getCategories = $("nav.items-center > ul > li > span > a");
  for (const cat of getCategories) {
    const url = $(cat).attr("href");
    console.log(url);
    await requestQueue.addRequest({
      url,
      userData: {
        label: "PAGE"
      }
    });
    stats.pages++;
  }
  log.info(`Enqueued ${getCategories.length} categories`);
}

async function handleSubCategory($, requestQueue, request) {
  const getSubcategories = $("#snippet--subcategories a");
  let subCatCount = 0;
  for (const subCat of getSubcategories) {
    const url = $(subCat).attr("href");
    if (!url.includes("?")) {
      subCatCount++;
      await requestQueue.addRequest(
        {
          url: url.includes("https") ? url : `${web}${url}`,
          userData: {
            label: "PAGE"
          }
        },
        { forefront: true }
      );
      stats.pages++;
    }
  }
  log.info(`Enqueued ${subCatCount} subcategories`);
}

async function handlePagination($, requestQueue, request, type) {
  let maxPage = 0;
  const snippetListing =
    type === ActorType.FULL
      ? $("#snippet--productListing")
      : $("#snippet--itemListing");
  snippetListing.find("ul.flex.flex-wrap.items-stretch li").each(function () {
    //Try parse Number value from paginator
    const liValue = Number($(this).text().trim());
    //Save highest page value
    if (liValue > maxPage) {
      maxPage = liValue;
    }
  });
  //Handle pagination pages
  if (maxPage > 0) {
    for (let i = 2; i <= maxPage; i++) {
      await requestQueue.addRequest(
        {
          url: `${request.url}?strana=${i}`,
          userData: {
            label: "PAGI_PAGE",
            category: request.userData.category
          }
        },
        { forefront: true }
      );
      stats.pages++;
    }
    log.info(`Found ${maxPage - 1} pagination pages.`);
  }
}

async function handleProducts($, requestQueue, request, type) {
  const itemListElements =
    type === ActorType.FULL
      ? $('[itemprop="itemListElement"]')
      : $(
          "#snippet--itemListing div.flex.flex-col.flex-wrap.items-stretch.w-full"
        );
  if (itemListElements.length > 0) {
    let breadCrumbs = [];
    try {
      $(
        "ul[itemtype='https://schema.org/BreadcrumbList'] [itemprop='name']"
      ).each(function () {
        const attrContent = $(this).attr("content");
        if (
          attrContent !== undefined &&
          attrContent.trim() !== "" &&
          attrContent.trim() !== "Úvodní strana"
        ) {
          breadCrumbs.push(attrContent);
        }

        const text = $(this).text();
        if (text !== undefined && text.trim() !== "") {
          breadCrumbs.push(text.trim());
        }
      });
      if (breadCrumbs.length > 0) {
        breadCrumbs = breadCrumbs.join(" > ");
      } else {
        breadCrumbs = "";
      }

      const products =
        type === ActorType.FULL
          ? await extractItems($, itemListElements, breadCrumbs)
          : await extractBfItems($, itemListElements, breadCrumbs);
      // we don't need to block pushes, we will await them all at the end
      const requests = [];
      for (const product of products) {
        // Save data to dataset
        if (!processedIds.has(product.itemId)) {
          processedIds.add(product.itemId);
          requests.push(
            Apify.pushData(product),
            uploadToS3v2(s3, product, { priceCurrency: "CZK", inStock: true })
          );
        } else {
          stats.itemsDuplicity++;
        }
      }
      stats.items += requests.length / 2;
      log.info(`Found ${requests.length / 2} unique products`);
      // await all requests, so we don't end before they end
      await Promise.all(requests);
    } catch (e) {
      log.error(e.message);
      log.error(`Failed extraction of items. ${request.url}`);
    }
  }
}

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    test = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  const requestQueue = await Apify.openRequestQueue();
  if (type === ActorType.BF) {
    const bfUrl = "https://www.lekarna.cz/blackfriday/";
    await requestQueue.addRequest({
      url: bfUrl,
      userData: {
        label: "PAGE",
        category: bfUrl
      }
    });
  } else if (type === ActorType.FULL && test) {
    await requestQueue.addRequest({
      url: "https://www.lekarna.cz/masazni-gely-roztoky/",
      userData: {
        label: "SUB_CATEGORY"
      }
    });
  } else if (type === "COUNT") {
    await countAllProducts();
  } else {
    await requestQueue.addRequest({
      url: web,
      userData: {
        label: "START"
      }
    });
    //await enqueueAllCategories(requestQueue);
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

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    handlePageFunction: async ({ $, request }) => {
      if (request.userData.label === "SUB_CATEGORY") {
        log.info(`START with sub category ${request.url}`);
        await handleSubCategory($, requestQueue, request);
      } else if (request.userData.label === "PAGE") {
        log.info(`START with page ${request.url}`);
        //Check for subcategory links
        await handleSubCategory($, requestQueue, request);
        //Check for pagination pages
        await handlePagination($, requestQueue, request, type);
        //Handle product on page
        await handleProducts($, requestQueue, request, type);
      } else if (request.userData.label === "PAGI_PAGE") {
        log.info(`START with page ${request.url}`);
        await handleProducts($, request, requestQueue, type);
      } else if (request.userData.label === "START") {
        await handleStart($, requestQueue);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();
  console.log("crawler finished");
  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development && type !== "COUNT") {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "lekarna.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola(
      type !== ActorType.FULL ? "lekarna_bf" : "lekarna_cz"
    );
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
});
