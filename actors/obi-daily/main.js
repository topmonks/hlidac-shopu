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

// const COUNTRY = {
//   CZ: "CZ",
//   SK: "SK",
//   PL: "PL",
//   HU: "HU",
//   IT: "IT", // obi-italia.it
//   DE: "DE",
//   AT: "AT",
//   RU: "RU",
//   CH: "CH"
// };

const processedIds = new Set();
let stats = {};
let pushList = [];

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
  if (!(categoryLinkList.length > 0)) {
    categoryLinkList = $("ul.first-level > li > a")
      .map(function () {
        return {
          href: $(this).attr("href")
          // dataWebtrekk: $(this).attr("wt_name")
        };
      })
      .get();
  }
  log.debug(
    `[handleStart] label: ${request.userData.label}, url: ${
      request.url
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
      stats.urls += 1;
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
      stats.urls += 1;
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
    stats.urls += requestList.length;
  }
  await handleList(context);
}

async function handleList({ $, requestQueue, request }) {
  let productLinkList = $("li.product > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  log.debug(
    `[handleList] label: ${request.userData.label}, url: ${
      request.url
    }, productLinkList: ${JSON.stringify(productLinkList)}`
  );
  if (global.inputData.development) {
    productLinkList = productLinkList.slice(0, 1);
    log.debug(
      `development mode, productLinkList: ${JSON.stringify(productLinkList)}`
    );
  }
  const homePageUrl = getHomePageUrl();
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

async function handleDetail({ request, $ }, s3, country) {
  log.debug(
    `[handleDetail] label: ${request.userData.label}, url: ${request.url}`
  );

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
  let originalPrice = currentPrice;
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
  const category = $("li.breadcrumb__dropdown__wrapper > a")
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
      Apify.pushData(result),
      // upload JSON+LD data to CDN
      uploadToS3(
        s3,
        `obi${country === "it" ? "-italia" : ""}.${country}`,
        result.itemId,
        "jsonld",
        toProduct(result, {})
      )
    );
    processedIds.add(result.itemId);
    stats.items += 1;
  } else {
    stats.itemsDuplicity += 1;
  }
  stats.totalItems += 1;
  if (pushList.length > 90) {
    await Promise.all(pushList);
    pushList = [];
  }
}

function parsePrice(text) {
  let price = text
    .trim()
    .replace(/\s|'/g, "")
    .replace(/,/, ".")
    // .replace(/'/, "")
    .match(/(\d+(.\d+)?)/)[0];
  price = parseFloat(price);
  return price;
}

Apify.main(async () => {
  log.info("Actor starts.");

  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();

  const { development = false, debug = false } = input ?? {};
  const country =
    (input && input.country && input.country.toLowerCase()) || "cz";
  global.inputData = { country, development, debug };

  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  let homePageUrl = `https://www.obi${
    country === "it" ? "-italia" : ""
  }.${country}`;
  global.homePageUrl = homePageUrl;
  await requestQueue.addRequest({
    url: homePageUrl,
    userData: {
      label: "START"
    }
  });

  // await requestQueue.addRequest({
  //   // url: "https://www.obi.de/lounge-gartenmoebel/lounge-set-3-teilig-aus-polyrattan-geflecht-hellgrau/p/1512136",
  //   // url: "https://www.obi.ru/napolnye-unitazy/napolnyi-unitaz-kompakt-damixa-palace-bit-s-sidenem-mikrolift/p/4811477",
  //   // url: "https://www.obi-italia.it/faretti/obi-barra-a-4-faretti-nicosia/p/4716742",
  //   // url: "https://www.obi.pl/dywany-z-krotkim-runem/multidecor-dywan-chindi-50-cm-x-70-cm-mix/p/3147824",
  //   // url: "https://www.obi.ch/e-bikes/prophete-e-mountainbike-graveler-aeg-sportdrive-27-5-/p/5361118",
  //   // url: "https://www.obi.at/elektro-pumpen-hauswasserwerke/gardena-pumpe-hauswasserwerk-3700-4/p/8605347#/",
  //   // url: "https://www.obi.at/gasgrills/char-broil-gasgrill-all-star-120-b/p/8333437#/",
  //   url: "https://www.obi.sk/lehatka/acamp-zavesne-kreslo-tonga/p/1447697",
  //   userData: {
  //     label: "DETAIL"
  //   }
  // });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 5,
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
        await handleDetail(context, s3, country);
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
    const tableName = `obi_${country}`;
    await uploadToKeboola(tableName);
    log.info(`update to Keboola finished ${tableName}.`);
  }
  log.info("Actor Finished.");
});
