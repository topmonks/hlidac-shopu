import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { S3Client } from "@aws-sdk/client-s3";
import {
  cleanPriceText,
  cleanUnitPriceText,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { URL } from "url";

const { log } = Apify.utils;
const s3 = new S3Client({ region: "eu-central-1" });

const HOST = "https://www.iglobus.cz";
const listUrl = x => `${HOST}${x}/core?razeni=cena&strana=0`;
const productUrl = x => `${HOST}${x}`;
const canonicalUrl = x => new URL(x, HOST);

Apify.main(async () => {
  rollbar.init();
  let stats = {};
  const processedIds = new Set();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 50,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  const requestQueue = await Apify.openRequestQueue();

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0
  };

  const crawlContext = {
    requestQueue,
    development,
    stats,
    processedIds
  };

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  await requestQueue.addRequest({ url: "https://www.iglobus.cz" });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency: development ? 1 : maxConcurrency,

    handlePageFunction: async context => {
      const {
        url,
        userData: { label }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "LIST":
          return handleList(context, crawlContext);
        default:
          return handleStart(context, crawlContext);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "iglobus.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola("globus_cz");
    log.info("upload to Keboola finished");
  }
  log.info("Finished.");
});

async function handleStart({ request, $ }, crawlContext) {
  const { requestQueue, stats } = crawlContext;
  const listLinks = $("#categories a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  for (const link of listLinks) {
    await requestQueue.addRequest({
      url: listUrl(link),
      userData: {
        label: "LIST",
        page: 0,
        category: link.replace("/", "").replaceAll("-", " ")
      }
    });
  }
  stats.categories = listLinks.length;
  log.info(`Found ${listLinks.length}x categories`);
}

async function handleList({ request, $ }, crawlContext) {
  // Handle pagination
  const { url, userData } = request;
  const { requestQueue, processedIds, stats } = crawlContext;
  stats.pages++;
  if (userData.page === 0) {
    const paginationLinks = $(".pagination .page-link")
      .map(function () {
        return parseInt($(this).text().trim());
      })
      .get();
    if (paginationLinks.length > 0) {
      //get last pagination page
      const lastPaginationPage = paginationLinks[paginationLinks.length - 2];
      for (let i = 1; i < lastPaginationPage; i++) {
        const newUrl = canonicalUrl(url);
        newUrl.searchParams.set("strana", i.toString());
        userData.page = i;
        await requestQueue.addRequest(
          {
            url: newUrl.href,
            userData
          },
          { forefront: true }
        );
      }
    }
  }
  // Handle products on list
  const $products = $(".products article.product-wrap");
  try {
    const products = await extractItems($, $products, userData.category);
    // we don't need to block pushes, we will await them all at the end
    const requests = [];
    for (const product of products) {
      if (!processedIds.has(product.itemId)) {
        processedIds.add(product.itemId);
        requests.push(Apify.pushData(product), uploadToS3v2(s3, product));
        stats.items++;
      } else {
        stats.itemsDuplicity++;
      }
    }
    log.info(`Found ${requests.length / 2} unique products`);
    // await all requests, so we don't end before they end
    await Promise.allSettled(requests);
  } catch (e) {
    console.error(e);
    console.log(`Failed extraction of items. ${request.url}`);
  }
}

async function extractItems($, $products, category) {
  const itemsArray = [];
  $products.each(function () {
    const result = {};
    const $head = $(this).find(".article-head");
    const $product = $(this).find(".product-box");

    result.itemId = $(this).attr("data-stock-item-code");
    result.itemName = $head.attr("data-title");
    result.itemUrl = productUrl(
      $head.find(".product-detail-link").attr("href")
    );
    result.img = $head.find(".img-fluid").eq(0).attr("src");
    const currentPrice = $product.find(".product-price").text().trim();
    result.currentPrice = cleanPriceText(currentPrice);
    result.originalPrice = cleanPriceText(
      $product.find(".product-price-before").text().trim()
    );
    result.currentUnitPrice = cleanUnitPriceText(
      $product.find(".product-price-unit").text().trim()
    );
    result.useUnitPrice = currentPrice.includes("cca");
    result.discounted = result.currentPrice < result.originalPrice;
    result.currency = "CZK";
    result.instStock = $head.attr("data-availability") === "skladem";
    result.category = category;
    itemsArray.push(result);
  });
  return itemsArray;
}
