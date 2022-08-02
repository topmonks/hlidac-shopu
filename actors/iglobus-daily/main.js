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

const ROOT_URL = "https://shop.iglobus.cz";
const LABELS = {
  START: "START",
  LIST: "LIST",
  COUNT: "COUNT"
};
// create object TYPE cofied from LABERLS
const TYPE = {
  FULL: "FULL",
  TEST: "TEST",
  COUNT: "COUNT"
};
const STORES = {
  ZLI: "ZLI",
  OST: "OST"
};

const rootUrl = ({ store = STORES.ZLI } = {}) =>
  `${ROOT_URL}/store/switch?store=${store}&referer-url=/cs/outlet`;

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
    maxRequestRetries = 3,
    maxConcurrency = 20,
    proxyGroups = ["CZECH_LUMINATI"],
    store = STORES.ZLI,
    type = TYPE.FULL
  } = input ?? {};
  const requestQueue = await Apify.openRequestQueue();

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    countItems: 0
  };

  if (development) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const crawlContext = {
    requestQueue,
    development,
    type,
    stats,
    processedIds,
    s3
  };

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  if (type === TYPE.FULL) {
    await requestQueue.addRequest({
      url: rootUrl({ store }),
      userData: { label: LABELS.START }
    });
  } else if (type === TYPE.TEST) {
    await requestQueue.addRequest({
      url: `https://shop.iglobus.cz/cs/sv%C4%9Bt-d%C4%9Bt%C3%AD/d%C4%9Btsk%C3%A1-v%C3%BD%C5%BEiva/p%C5%99%C3%ADkrmy/ovocn%C3%A9`,
      userData: {
        label: LABELS.LIST,
        page: 0,
        category: "Ovocné"
      }
    });
  }
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency: development ? 1 : maxConcurrency,

    handlePageFunction: async context => {
      const {
        url,
        userData: { label, category }
      } = context.request;
      log.info("Page opened.", { label, category, url });
      switch (label) {
        case LABELS.START:
          return handleStart(context, crawlContext);
        case LABELS.LIST:
          return handleList(context, crawlContext);
        case LABELS.COUNT:
          return handleCount(context, crawlContext);
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
    ".menu > li.filter-category__item--level-2 > button.filter-category__link",
    ".menu > li.filter-category__item--level-2 > div > div > button.filter-category__link",
    ".menu > li.filter-category__item--level-3 > button.filter-category__link",
    ".menu > li.filter-category__item--level-3 > div > div > button.filter-category__link"
  ]
    .map(selector => $(selector).get())
    .flat();
  const countLinks = ["a.navigation-multilevel-node__link-inner--lvl-2"]
    .map(selector => $(selector).get())
    .flat();
  if (crawlContext.type === TYPE.COUNT) {
    for (const countLink of countLinks) {
      const url = new URL($(countLink).attr("href"), ROOT_URL);
      if (!url.toString().includes("novinky")) {
        await requestQueue.addRequest({
          url: `${url.href}`,
          userData: {
            label: LABELS.COUNT,
            category: $(countLink).text().trim()
          }
        });
      }
    }
  } else {
    for (const link of listLinks) {
      const url = new URL($(link).attr("data-url"), ROOT_URL);
      await requestQueue.addRequest({
        url: `${url.href}`,
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
}

// create function handleCount copied from handleList
async function handleCount({ request, $ }, crawlContext) {
  const { requestQueue, stats } = crawlContext;
  const count = $("span.category-number-of-products")
    .text()
    .trim()
    .match(/\d+/)[0];
  stats.countItems += parseInt(count);
  log.info(`Found ${count} items in category ${request.userData.category}`);
}

async function handleList({ request, $ }, crawlContext) {
  // Handle pagination
  const { url, userData } = request;
  const { requestQueue, processedIds, stats, s3 } = crawlContext;
  stats.pages++;
  if (userData.page === 0) {
    const lastPageLink = $(
      ".pagination .pagination__step-cz:not(.pagination__step--next-cz)"
    )
      .last()
      .attr("href");

    const paginationLink = new URL(lastPageLink, ROOT_URL);

    // get total pagination pages in current category
    const pagesTotal = paginationLink.searchParams.get("page");

    //get last pagination page
    for (let i = 2; i <= pagesTotal; i++) {
      paginationLink.searchParams.set("sort", "price_asc");
      paginationLink.searchParams.set("page", i.toString());
      userData.page = i;
      await requestQueue.addRequest(
        {
          url: paginationLink.href,
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
    await Promise.all(requests);
  } catch (e) {
    console.error(e);
    console.log(`Failed extraction of items. ${request.url}`);
  }
}

async function extractItems($, $products, category) {
  const itemsArray = [];
  $products.each(function () {
    const result = { inStock: true };
    result.itemId = $(this).find(".add-to-cart-btn a").attr("data-product-id");
    result.itemName = $(this).find("div.product-item__info > a").text().trim();
    result.itemUrl = extractProductUrl(
      $(this).find("div.product-item__info > a").attr("onclick")
    );
    result.img = $(this).find(".image-link img").attr("src");

    result.currentPrice = parseFloat(
      cleanPriceText(
        $(this).find(".money-price > span:last-child").text().trim()
      )
    );
    result.originalPrice = parseFloat(
      cleanPriceText(
        $(this).find(".money-price__amount--original").text().trim()
      )
    );
    result.currentUnitPrice = parseFloat(
      cleanUnitPriceText(
        $(this).find(".product-item__sale-volume").text().trim()
      )
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
