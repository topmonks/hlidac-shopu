import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const { log } = Apify.utils;

async function handleStart(
  { $, requestQueue, request },
  { homePageUrl, inputData }
) {
  let categoryLinkList = $(
    "div.headr__nav-cat-col-inner > div.headr__nav-cat-row > a.headr__nav-cat-link"
  )
    .map(function () {
      return {
        href: $(this).attr("href"),
        dataWebtrekk: $(this).attr("data-webtrekk")
      };
    })
    .get();
  if (!(categoryLinkList.length > 0)) {
    categoryLinkList = $("ul.first-level > li > a")
      .map(function () {
        return {
          href: $(this).attr("href")
        };
      })
      .get();
  }
  log.debug(
    `[handleStart] label: ${request.userData.label}, url: ${
      request.url
    }, subcategories: ${JSON.stringify(categoryLinkList)}`
  );
  if (inputData.development) {
    categoryLinkList = categoryLinkList.slice(0, 1);
    log.debug(
      `development mode, subcategory is ${JSON.stringify(categoryLinkList)}`
    );
  }

  for (const categoryObject of categoryLinkList) {
    if (!categoryObject.dataWebtrekk) {
      const categoryUrl = new URL(categoryObject.href, homePageUrl).href;
      await requestQueue.addRequest({
        url: categoryUrl,
        userData: { label: "SUBCAT" }
      });
      stats.urls += 1;
    }
  }
}

async function handleSubCategory(context, { homePageUrl, inputData }) {
  const { $, requestQueue, request } = context;
  const productCount = $($("div.variants")).attr("data-productcount");
  const label = request.userData.label;
  log.debug(
    `[handleSubCategory] label: ${label}, url: ${request.url}, productCount ${productCount}`
  );

  if (productCount) {
    await handleLastSubCategory(context, { inputData });
  } else {
    let subCategoryList = $('a[wt_name="assortment_menu.level2"]')
      .map(function () {
        return $(this).attr("href");
      })
      .get();
    log.debug(`${label}I ${JSON.stringify(subCategoryList)}`);
    if (inputData.development) {
      subCategoryList = subCategoryList.slice(0, 1);
      log.debug(
        `development mode, ${label}I is ${JSON.stringify(subCategoryList)}`
      );
    }
    for (const subcategoryLink of subCategoryList) {
      const subcategoryUrl = new URL(subcategoryLink, homePageUrl).href;
      await requestQueue.addRequest({
        url: subcategoryUrl,
        userData: { label: label + "I" }
      });
      stats.urls += 1;
    }
  }
}

async function handleLastSubCategory(context, { inputData }) {
  const { $, requestQueue, request } = context;
  const productCount = parseInt($($("div.variants")).attr("data-productcount"));
  log.debug(
    `[handleLastSubCategory] label: ${request.userData.label}, url: ${request.url}, productCount ${productCount}`
  );
  const productPerPageCount = $("li.product > a")
    .map(function () {
      if ($(this).attr("data-ui-name")) {
        return $(this).attr("href");
      }
    })
    .get().length;
  let pageCount = Math.ceil(productCount / productPerPageCount);
  if (inputData.development) {
    pageCount = 1;
  }
  if (pageCount > 1) {
    const requestList = Array(pageCount - 1)
      .fill(0)
      .map((_, i) => i + 2)
      .map(i => {
        const url = `${request.url}/?page=${i}`;
        return requestQueue.addRequest({
          url,
          userData: { label: "LIST" }
        });
      });
    await Promise.all(requestList);
    stats.urls += requestList.length;
  }
  await handleList(context, { inputData });
}

async function handleList({ $, requestQueue, request }, { homePageUrl }) {
  let productLinkList = $("li.product > a")
    .map(function () {
      if ($(this).attr("data-ui-name")) {
        return $(this).attr("href");
      }
    })
    .get();
  log.debug(
    `[handleList] label: ${request.userData.label}, url: ${
      request.url
    }, productLinkList: ${JSON.stringify(productLinkList)}`
  );
  const requestList = productLinkList.map(url => {
    const productDetailUrl = new URL(url, homePageUrl).href;
    return requestQueue.addRequest({
      url: productDetailUrl,
      userData: { label: "DETAIL" }
    });
  });
  await Promise.all(requestList);
  stats.urls += requestList.length;
}

async function handleDetail(
  context,
  { dataset, s3, processedIds, pushList, variantIds }
) {
  // log.debug(
  //   `[handleDetail] label: ${request.userData.label}, url: ${request.url}`
  // );
  const { request, $ } = context;
  const itemName = $(".overview__description >.overview__heading")
    .text()
    .trim();
  const itemId = $('input[name="code"]').attr("value").trim();
  let currency = $('meta[itemprop="priceCurrency"]')
    .map(function () {
      return $(this).attr("content");
    })
    .get()[0];
  if (currency === "SKK") {
    currency = "EUR";
  }
  let currentPrice = $('[data-ui-name="ads.price.strong"]').text();
  currentPrice = parsePrice(currentPrice);
  let discountedPrice = $(".saving").get(0);
  let originalPrice = null;
  if (discountedPrice) {
    originalPrice = $(discountedPrice.parent.children)
      .map(function () {
        const el = $(this);
        const tagName = el.get(0).tagName;
        if (tagName === "del") {
          const text = el.text();
          if (text.match(/\d/)) {
            return text;
          }
        }
      })
      .get(0);
    originalPrice = parsePrice(originalPrice);
    discountedPrice = originalPrice - currentPrice;
  }
  const discounted = !!discountedPrice;
  const inStock = !!$("div.marg_b5").text().match(/(\d+)/);
  let img = $(".ads-slider__link").attr("href");
  if (!img) {
    img = $(".ads-slider__image")
      .map(function () {
        return $(this).attr("data-src");
      })
      .get(0);
  }
  img = `https:${img}`;
  const category = $('a[class*="normal"][wt_name*="breadcrumb.level"]')
    .map(function () {
      return $(this).text();
    })
    .get()
    .join("/");
  const result = {
    itemUrl: request.url,
    itemName,
    itemId,
    currency,
    currentPrice,
    discounted,
    originalPrice,
    inStock,
    img,
    category
  };
  if (!processedIds.has(result.itemId)) {
    pushList.push(
      // push data to dataset to be ready for upload to Keboola
      dataset.pushData(result),
      // upload JSON+LD data to CDN
      uploadToS3v2(s3, result)
    );
    processedIds.add(result.itemId);
    stats.items += 1;
  } else {
    stats.itemsDuplicity += 1;
  }
  stats.totalItems += 1;
  if (pushList.length > 70) {
    // await Promise.all(pushList);
    await Promise.allSettled(pushList);
    pushList = [];
  }

  await handleVariant(context, { variantIds, processedIds });
}

function getItemIdFromUrl(url) {
  return url.match(/p\/(\d+)(#\/)?$/)?.[1];
}

async function handleVariant(
  { $, requestQueue, request },
  { variantIds, processedIds }
) {
  let crawledItemId = getItemIdFromUrl(request.url);
  let productLinkList = $(
    '.selectboxes .selectbox li:not([class*="disabled"]) a[wt_name*="size_variant"], ' +
      '.selectboxes .selectbox li[data-ui-name="ads.variants.color.enabled"] a[wt_name*="color_variant"]'
  )
    .map(function () {
      let productUrl = $(this).attr("href");
      if (!productUrl) {
        return;
      }
      let itemId = getItemIdFromUrl(productUrl);
      if (
        crawledItemId === itemId ||
        variantIds.has(itemId) ||
        processedIds.has(itemId)
      ) {
        return;
      }
      variantIds.add(itemId);
      return productUrl;
    })
    .get();

  if (!(productLinkList.length > 0)) {
    return;
  }

  log.debug(
    `[handleVariant] label: ${request.userData.label}, url: ${
      request.url
    }, productLinkList: ${JSON.stringify(productLinkList)}`
  );

  const requestList = productLinkList.map(url => {
    return requestQueue.addRequest({
      url: url,
      userData: { label: "DETAIL" }
    });
  });
  await Promise.all(requestList);
  stats.urls += requestList.length;
}

function parsePrice(text) {
  let price = text
    .trim()
    .replace(/\s|'/g, "")
    .replace(/,/, ".")
    .match(/(\d+(.\d+)?)/)[0];
  price = parseFloat(price);
  return price;
}

Apify.main(async () => {
  log.info("Actor starts.");

  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const processedIds = new Set();
  const variantIds = new Set();
  let stats = {};
  let pushList = [];

  const input = await Apify.getInput();

  const {
    development = false,
    debug = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxRequestRetries = 3,
    maxConcurrency = 10
  } = input ?? {};
  const country =
    (input && input.country && input.country.toLowerCase()) || "cz";
  const inputData = { country, development, debug };

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };
  const dataset = await Apify.openDataset();

  const requestQueue = await Apify.openRequestQueue();
  let homePageUrl = `https://www.obi${
    country === "it" ? "-italia" : ""
  }.${country}`;
  await requestQueue.addRequest({
    url: homePageUrl,
    userData: {
      label: "START"
    }
  });

  // await requestQueue.addRequest({
  //   url: 'https://www.obi.de/leisten/endkappe-fuer-sockelleiste-ahorn-22-mm-x-40-mm/p/9124561#/',
  //   userData: {
  //     label: "DETAIL"
  //   }
  // });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    handlePageFunction: async context => {
      const { label } = context.request.userData;
      context.requestQueue = requestQueue;
      if (label === "START") {
        await handleStart(context, { homePageUrl, inputData });
      } else if (label.includes("SUBCAT")) {
        await handleSubCategory(context, { homePageUrl, inputData });
      } else if (label === "LIST") {
        await handleList(context, { homePageUrl });
      } else if (label === "DETAIL") {
        await handleDetail(context, {
          dataset,
          s3,
          processedIds,
          pushList,
          variantIds
        });
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("crawler starts.");
  await crawler.run();
  log.info("crawler finished");

  await Apify.setValue("STATS", stats);
  log.info(JSON.stringify(stats));

  const directoryName = `obi${country === "it" ? "-italia" : ""}.${country}`;
  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", directoryName);
  log.info(`invalidated Data CDN ${directoryName}`);

  if (!development) {
    const tableName = `obi${country === "it" ? "-italia" : ""}_${country}`;
    await uploadToKeboola(tableName);
    log.info(`update to Keboola finished ${tableName}.`);
  }
  log.info("Actor Finished.");
});
