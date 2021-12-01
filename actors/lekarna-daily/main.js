const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const cheerio = require("cheerio");
const zlib = require("zlib");

const { log, requestAsBrowser } = Apify.utils;
const BF = "BF";
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
        label: "SUB_CATEGORY",
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
      log.info(`Skipp non price product [${name}]`);
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

async function handleSubCategory($, requestQueue, request) {
  const getSubcategories = $("#snippet--subcategories").find("a");
  if (getSubcategories.length === 0) {
    //This is final category, add as page for page/item scraping
    await requestQueue.addRequest({
      url: `${request.url}?visualPaginator-firstPage=1`,
      userData: {
        label: "PAGE",
        category: request.url
      }
    });
    stats.pages++;
  }
  //Continue, if this isn't last subcategory
}

async function handleProducts($, request, requestQueue, type) {
  const itemListElements =
    type === "FULL"
      ? $('[itemprop="itemListElement"]')
      : $(
          "#snippet--itemListing div.flex.flex-col.flex-wrap.items-stretch.w-full"
        );
  if (itemListElements.length > 0) {
    let breadCrumbs = [];
    try {
      $("div.cat")
        .find("a")
        .each(function () {
          if (
            !$(this).attr("href").includes("#") &&
            $(this).text().trim() !== ""
          ) {
            breadCrumbs.push($(this).text().trim());
          }
        });
      if (breadCrumbs.length > 0) {
        breadCrumbs = breadCrumbs.join(" > ");
      } else {
        breadCrumbs = "";
      }

      const products =
        type === "FULL"
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
            uploadToS3(
              s3,
              "lekarna.cz",
              await s3FileName(product),
              "jsonld",
              toProduct(
                {
                  ...product,
                  inStock: true
                },
                { priceCurrency: "CZK" }
              )
            )
          );
        } else {
          stats.itemsDuplicity++;
        }
      }
      stats.items += requests.length;
      console.log(`Found ${requests.length} unique products`);
      // await all requests, so we don't end before they end
      await Promise.all(requests);
    } catch (e) {
      console.log(`Failed extraction of items. ${request.url}`);
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
    type = "FULL"
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
  if (type === BF) {
    const bfUrl = "https://www.lekarna.cz/blackfriday/";
    await requestQueue.addRequest({
      url: bfUrl,
      userData: {
        label: "PAGE",
        category: bfUrl
      }
    });
  } else if (type === "FULL" && test) {
    await requestQueue.addRequest({
      url: "https://www.lekarna.cz/masazni-gely-roztoky/",
      userData: {
        label: "SUB_CATEGORY"
      }
    });
  } else if (type === "COUNT") {
    await countAllProducts();
  } else {
    await enqueueAllCategories(requestQueue);
    // to test one item/category
    /*await requestQueue.addRequest({
      url: "https://www.lekarna.cz/masazni-gely-roztoky/",
      userData: {
        label: "SUB_CATEGORY"
      }
    });*/
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
        console.log(`START with sub category ${request.url}`);
        await handleSubCategory($, requestQueue, request);
      } else if (request.userData.label === "PAGE") {
        console.log(`START with page ${request.url}`);
        //Check for pagination pages
        let maxPage = 0;
        const snippetListing =
          type === "FULL"
            ? $("#snippet--productListing")
            : $("#snippet--itemListing");
        snippetListing
          .find("ul.flex.flex-wrap.items-stretch li")
          .each(function () {
            //Try parse Number value from paginator
            const liValue = Number($(this).text().trim());
            //Save highest page value
            if (liValue > maxPage) {
              maxPage = liValue;
            }
          });
        await handleProducts($, request, requestQueue, type);
        //Handle pagination pages
        if (maxPage !== 0) {
          const paginationPage = [];
          for (let i = 2; i <= maxPage; i++) {
            paginationPage.push({
              url: `${request.userData.category}?strana=${i}`,
              userData: {
                label: "PAGI_PAGE",
                category: request.userData.category
              }
            });
            stats.pages++;
          }
          console.log(`Found ${paginationPage.length} pages.`);
          await enqueueRequests(requestQueue, paginationPage);
        }
      } else if (request.userData.label === "PAGI_PAGE") {
        console.log(`START with page ${request.url}`);
        await handleProducts($, request, requestQueue);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed 10 times`);
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
    await uploadToKeboola(type !== "FULL" ? "lekarna_bf" : "lekarna_cz");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
});
