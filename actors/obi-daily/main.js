const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const {
  toProduct,
  uploadToS3,
  invalidateCDN
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const { log } = Apify.utils;

const COUNTRY = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  IT: "IT", // obi-italia.it
  DE: "DE",
  AT: "AT",
  RU: "RU",
  CH: "CH"
};

// function s3FileName(detail) {
//   const url = new URL(detail.itemUrl);
//   return url.pathname.match(/-p(\d+)\.html$/)?.[1];
// }

function getHomePageUrl() {
  return global.homePageUrl;
}

const handleStart = async ({ $, requestQueue, request }) => {
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
  log.debug(
    `[handleStart] label: ${
      request.userData.label
    }, subcategories: ${JSON.stringify(categoryLinkList)}`
  );
  if (global.inputData.development) {
    categoryLinkList = categoryLinkList.slice(0, 1);
    log.debug(
      `development mode, subcategory is ${JSON.stringify(categoryLinkList)}`
    );
  }

  const homePageUrl = getHomePageUrl();
  for (const categoryObject of categoryLinkList) {
    if (!categoryObject.dataWebtrekk) {
      const categoryUrl = new URL(categoryObject.href, homePageUrl).href;
      // log.debug(categoryUrl);
      await requestQueue.addRequest({
        url: categoryUrl,
        userData: { label: "SUBCAT" }
      });
    }
  }
};

async function handleSubCategory(context) {
  const { $, requestQueue, request } = context;
  const productCount = $($("div.variants")).attr("data-productcount");
  const label = request.userData.label;
  log.debug(
    `[handleSubCategory] label: ${label}, url: ${request.url}, productCount ${productCount}`
  );

  if (productCount) {
    await handleLastSubCategory(context);
  } else {
    let subCategoryList = $('a[wt_name="assortment_menu.level2"]')
      .map(function () {
        return $(this).attr("href");
      })
      .get();
    log.debug(`${label}I ${JSON.stringify(subCategoryList)}`);
    if (global.inputData.development) {
      subCategoryList = subCategoryList.slice(0, 1);
      log.debug(
        `development mode, ${label}I is ${JSON.stringify(subCategoryList)}`
      );
    }
    const homePageUrl = getHomePageUrl();
    for (const subcategoryLink of subCategoryList) {
      const subcategoryUrl = new URL(subcategoryLink, homePageUrl).href;
      await requestQueue.addRequest({
        url: subcategoryUrl,
        userData: { label: label + "I" }
      });
    }
  }
}

async function handleLastSubCategory(context) {
  const { $, requestQueue, request } = context;
  const productCount = parseInt($($("div.variants")).attr("data-productcount"));
  log.debug(
    `[handleLastSubCategory] label: ${request.userData.label}, url: ${request.url}, productCount ${productCount}`
  );
  const productPerPageCount = $("li.product").get().length;
  let pageCount = Math.ceil(productCount / productPerPageCount);
  if (global.inputData.development) {
    pageCount = 1;
  }
  // for (let i = 2; i <= pageCount; i++) {
  //   const url = `${request.url}/?page=${i}`;
  //   await requestQueue.addRequest({
  //     url,
  //     userData: { label: "LIST" }
  //   });
  // }
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
  }
  await handleList(context);
}

async function handleList({ $, requestQueue, request }) {
  let productLinkList = $("li.product > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  if (global.inputData.development) {
    productLinkList = productLinkList.slice(0, 1);
  }
  const homePageUrl = getHomePageUrl();
  const requestList = productLinkList.map(url => {
    const productDetailUrl = new URL(url, homePageUrl).href;
    return requestQueue.addRequest({
      url: productDetailUrl,
      userData: { label: "DETAIL" }
    });
  });
  log.debug(
    `[handleList] ${request.url}, productDetailCount ${requestList.length}`
  );
  await Promise.all(requestList);
}
//
// function getProductAttribute($){
//   const scriptTextList = $('script').map(function () {
//     return $(this).html();
//   }).get();
//   const variableDataLayer = "dataLayer =";
//   const variableWtConfig = "var wtConfig =";
//   let dataLayer;
//   let wtConfig;
//   const productAttribute = {};
//   for (const scriptText of scriptTextList) {
//     const foundDataLayer = scriptText.match(variableDataLayer);
//     if (foundDataLayer) {
//       const startIndex = scriptText.search(variableDataLayer);
//       const endIndex = scriptText.search(";");
//       if (startIndex != -1 && endIndex != -1) {
//         const value = scriptText.substring(startIndex + variableDataLayer.length, endIndex);
//         dataLayer = JSON.parse(value);
//       }
//     }
//     const foundWtConfig = scriptText.match(variableWtConfig);
//     if (foundWtConfig) {
//       const startIndex1 = scriptText.search(variableWtConfig);
//       const endIndex1 = scriptText.search("};");
//       if (startIndex1 != -1 && endIndex1 != -1) {
//         const value1 = scriptText.substring(startIndex1 + variableWtConfig.length, endIndex1);
//         wtConfig = JSON.parse(value1);
//       }
//     }
//     if (dataLayer && wtConfig) {
//       break;
//     }
//   }
//   return {dataLayer, wtConfig};
// }

// async function handleDetail({ request }) {
//   log.debug(`handleDetail ${request.url}`);
// }

Apify.main(async () => {
  log.info("Actor starts.");

  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();

  const {
    country = COUNTRY.CZ,
    development = false,
    debug = false
  } = input ?? {};
  global.inputData = { country, development, debug };

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  let homePageUrl;
  if (country === "IT") {
    homePageUrl = "https://www.obi-italia.it";
  } else {
    homePageUrl = `https://www.obi.${country.toLowerCase()}`;
  }
  global.homePageUrl = homePageUrl;
  await requestQueue.addRequest({
    url: homePageUrl,
    userData: {
      label: "START"
    }
  });

  // await requestQueue.addRequest({
  //   url: "https://www.obi.cz/vyrovnavaci-hmoty/cemix-beton-b25-25-kg/p/5811302",
  //   userData: {
  //     label: "DETAIL"
  //   }
  // });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false
  });

  let pushList = [];
  const processedIds = new Set();
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 1,
    handlePageFunction: async context => {
      const { label } = context.request.userData;
      context.requestQueue = requestQueue;
      if (label === "START") {
        await handleStart(context);
      } else if (label.includes("SUBCAT")) {
        await handleSubCategory(context);
      } else if (label === "LIST") {
        await handleList(context);
      } else if (label === "DETAIL") {
        const { request, $ } = context;
        log.debug(`[handleDetail] label: ${label} ${request.url}`);

        const itemName = $(".overview__description >.overview__heading").text();
        const itemId = $('input[name="code"]').attr("value");
        // todo currency and currentPrice not good
        const currency = $('meta[itemprop="priceCurrency"]').attr("content");
        const currentPrice = parseFloat($(".overview__price").text());
        const discounted = false;
        const inStock = $(".overview__flag-available").get().length != 0;
        const img = `https:${$(".ads-slider__link").attr("href")}`;
        const category = $("li.breadcrumb__dropdown__wrapper > a")
          .map(function () {
            return $(this).text();
          })
          .get()
          .join("/");
        const result = {
          itemName,
          itemId,
          currency,
          currentPrice,
          discounted,
          originalPrice: currentPrice,
          inStock,
          img,
          category,
          itemUrl: request.url
        };
        if (!processedIds.has(result.itemId)) {
          pushList.push(
            // push data to dataset to be ready for upload to Keboola
            Apify.pushData(result),
            // upload JSON+LD data to CDN
            uploadToS3(
              s3,
              `obi${
                country === "IT" ? "-italia" : ""
              }.${country.toLowerCase()}`,
              result.itemId,
              "jsonld",
              toProduct(result, {})
            )
          );
          processedIds.add(result.itemId);
        }
        if (pushList.length > 90) {
          await Promise.all(pushList);
          pushList = [];
        }
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("crawler starts.");
  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(
    cloudfront,
    "EQYSHWUECAQC9",
    `obi.${country.toLowerCase()}`
  );
  log.info("invalidated Data CDN");
  if (!development) {
    const tableName = `obi_${country.toLowerCase()}`;
    await uploadToKeboola(tableName);
    log.info("update to Keboola finished.");
  }
  log.info("Actor Finished.");
});
