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

const ROOT_URL = "https://shop.iglobus.cz";
const LABELS = {
  START: "START",
  LIST: "LIST"
};
const STORES = {
  ZLI: "ZLI",
  OST: "OST"
};

const rootUrl = ({ store = STORES.OST } = {}) =>
  `${ROOT_URL}/store/switch?store=${store}&referer-url=/cs/outlet?ipp=72`;

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
    proxyGroups = ["CZECH_LUMINATI"],
    store = STORES.OST
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

  await requestQueue.addRequest({
    url: rootUrl({ store }),
    userData: { label: LABELS.START }
  });
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
        case LABELS.START:
          return handleStart(context, crawlContext);
        case LABELS.LIST:
          return handleList(context, crawlContext);
        default:
          log.error(`Unknown label ${label}`);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats);
  log.debug("STATS saved!");
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
  const listLinks = [
    "#product-category-list .navigation-multilevel-node--lvl-3 a",
    "#product-category-list .navigation-multilevel-node--lvl-2 a",
    "#product-category-list .navigation-multilevel-node--lvl-1 a"
  ]
    .map(selector => $(selector).get())
    .flat();

  for (const link of listLinks) {
    const url = new URL($(link).attr("href"), ROOT_URL);
    await requestQueue.addRequest({
      url: `${url.href}?ipp=72`,
      userData: {
        label: LABELS.LIST,
        page: 0,
        category: $(link).text().trim()
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
    const pagesTotal = parseInt(
      $(".pagination .pagination__step:not(.pagination__step--next)")
        .last()
        .text()
        .trim()
    );

    //get last pagination page
    for (let i = 1; i <= pagesTotal; i++) {
      const newUrl = new URL(url, ROOT_URL);
      newUrl.searchParams.set("page", i.toString());
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
  // Handle products on list
  const $products = $(".product-list product-item");
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
    result.itemId = $(this).find(".add-to-cart-btn a").attr("data-product-id");
    result.itemName = $(this).find(".product-item__name").text().trim();
    result.itemUrl = extractProductUrl(
      $(this).find(".product-item__name").attr("onclick")
    );
    result.img = $(this).find(".image-link img").attr("src");

    result.currentPrice = cleanPriceText(
      $(this).find(".money-price__amount:last-child").text().trim()
    );
    result.originalPrice = cleanPriceText(
      $(this).find(".money-price__amount:first-child").text().trim()
    );
    result.currentUnitPrice = cleanUnitPriceText(
      $(this).find(".product-item__sale-volume").text().trim()
    );
    result.useUnitPrice = $(this)
      .find(".product-item__info")
      .text()
      .includes("cca");
    result.discounted = result.currentPrice < result.originalPrice;
    result.currency = "CZK";
    // result.instStock =
    result.category = category;
    itemsArray.push(result);
  });
  return itemsArray;
}

function extractProductUrl(onclickAttr) {
  if (!onclickAttr) return null;
  const regexp = /\'(\S+)\'/m;
  const match = regexp.exec(onclickAttr);
  return `${ROOT_URL}${match[1]}`;
}
