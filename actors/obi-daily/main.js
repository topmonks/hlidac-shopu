//https://www.obi.cz/sitemap_index.xml -> https://www.obi.cz/sitemaps/obi_cs_cz/sitemap_obi-category.xml

// label: DETAIL (https://www.obi.cz/zavesne-kreslo-a-vznasejici-se-kreslo/zavesne-kreslo-lytton-z-polycottonu-bila/p/5793559)
// goal: productAttributes = {
//           itemId: p.gtin,
//           itemName: `${p.brandName} ${p.name}`,
//           itemUrl: createProductUrl(
//             country,
//             p.links
//               .filter(x => x.rel === "self")
//               .map(x => x.href)
//               .pop()
//           ),
//           img: p.links
//             .filter(x => x.rel.startsWith("productimage"))
//             .map(x => x.href)
//             .pop(),
//           inStock: !p.notAvailable,
//           currentPrice: parseFloat(p.price),
//           originalPrice: p.isSellout ? parseFloat(p.selloutPrice) : null,
//           currency: p.priceCurrencyIso,
//           category,
//           discounted: p.isSellout
//         };
// have: dataLayer = [
//   {
// 	"page": "cz.assortment.bydlení.nábytek.křesla.závěsné_křeslo_a_vznášející_se_kreslo.závěsné_křeslo_lytton_z_polycottonu_bílá.ads",
// 	"contentGroup1": "assortment",
// 	"contentGroup2": "Bydlení",
// 	"contentGroup3": "Nábytek",
// 	"contentGroup4": "Křesla",
// 	"contentGroup5": "Závěsné křeslo a vznášející se kreslo",
// 	"language": "cz",
// 	"pagetype": "ads",
// 	"store": "014 - Praha - Štěrboholy",
// 	"displayType": "d",
// 	"userStatus": 0,
// 	"channel": "mix",
// 	"ecommerce": {
// 		"currencyCode": "CZK",
// 		"detail": {
// 			"products": [
// 				{
// 					"name": "Závěsné křeslo Lytton z polycottonu bílá",
// 					"id": "5793559",
// 					"price": "825.62",
// 					"brand": "",
// 					"category": "Bydlení/Nábytek/Křesla/Závěsné křeslo a vznášející se kreslo",
// 					"categoryId": "2368"
// 				}
// 			]
// 		}
// 	}
// }
// ]
// ?? const dataLayer = await page.evaluate((varname) => window[varname], 'dataLayer');
// price span.overview__price
// img img.ads-slider__image [0]
// inStock: !!dataLayer.store

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

function s3FileName(detail) {
  const url = new URL(detail.itemUrl);
  return url.pathname.match(/-p(\d+)\.html$/)?.[1];
}

// label default empty (https://www.obi.country || obi-italia.it)
// categorie  = div.headr__nav-cat-col-inner > div.headr__nav-cat-row > a.headr__nav-cat-link
// categorie (url: https://www.obi.cz/bydleni/c/874, label: CAT) -> url
// ["/stavba/c/877","/zahrada-a-volny-cas/c/860","/technika/c/876","/bydleni/c/874",
// "/kuchyne/c/875","/koupelna/c/4159","/prodejny/services/market-services/cutting-service/",
// "/pujcovna/","/prodejny/services/","https://www.obi.cz/prodejny/praha-sterboholy/",
// "/prodejny/markt-finder/?market=014&view=route","
//   #"]
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
  log.debug(`categoryLinkList ${JSON.stringify(categoryLinkList)}`);
  if (global.inputData.development) {
    categoryLinkList = categoryLinkList.slice(0, 1);
    log.debug(
      `development mode, subcatefory is ${JSON.stringify(categoryLinkList)}`
    );
  }

  const homePageUrl = request.url;
  for (const categoryObject of categoryLinkList) {
    if (!categoryObject.dataWebtrekk) {
      const categoryUrl = new URL(categoryObject.href, homePageUrl).href;
      // log.debug(categoryUrl);
      await requestQueue.addRequest({
        url: categoryUrl,
        userData: { label: "CAT" }
      });
    }
  }
};

// label: CAT (https://www.obi.cz/bydleni/c/874)
// subcategorie = ul.first-level > li > a
// subcategorie (url: https://www.obi.cz/bydleni/nabytek/c/2226, label: SUBCAT) > url
async function handleCategory({ $, requestQueue, request }) {
  let subCategoryList = $("ul.first-level > li > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  log.debug(`subCategoryList ${JSON.stringify(subCategoryList)}`);
  if (global.inputData.development) {
    subCategoryList = subCategoryList.slice(0, 1);
    log.debug(
      `development mode, subcatefory is ${JSON.stringify(subCategoryList)}`
    );
  }
  const homePageUrl = request.url;
  for (const subcategoryLink of subCategoryList) {
    const subcategoryUrl = new URL(subcategoryLink, homePageUrl).href;
    await requestQueue.addRequest({
      url: subcategoryUrl,
      userData: { label: "SUBCAT" }
    });
  }
}

// label: SUBCAT ( https://www.obi.cz/bydleni/nabytek/c/2226)
// get productCount: div.variants --> data-productcount (312 products)
// get productPerPageCount per page: li.product (72 products per page)
// pagination: Math.ceil(productCount / productPerPageCount)  (5 pages)
// add pagination for i=2..5 (url: https://www.obi.cz/bydleni/nabytek/c/2226?page=i, label: LIST ) -> url
async function handleSubCategory(context) {
  const { $, requestQueue, request } = context;
  const productCount = parseInt($($("div.variants")).attr("data-productcount"));
  const productPerPageCount = $("li.product").get().length;
  let pageCount = Math.ceil(productCount / productPerPageCount);
  if (global.inputData.development) {
    pageCount = Math.min(2, pageCount);
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

// label: LIST (https://www.obi.cz/bydleni/nabytek/c/2226)
// product li.product > a , get href
// detail (url: https://www.obi.cz/zavesne-kreslo-a-vznasejici-se-kreslo/zavesne-kreslo-lytton-z-polycottonu-bila/p/5793559,
// label: DETAIL) -> url
async function handleList({ $, requestQueue, request }) {
  log.debug(`handleList ${request.url}`);
  const productLinkList = $("li.product > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  const requestList = productLinkList.map(url => {
    return requestQueue.addRequest({
      url,
      userData: { label: "DETAIL" }
    });
  });
  await Promise.all(requestList);
}

async function handleDetail() {}

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
  await requestQueue.addRequest({
    url: homePageUrl,
    userData: {
      label: "START"
    }
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 1,
    handlePageFunction: async context => {
      const { label } = context.request.userData;
      context.requestQueue = requestQueue;
      if (label === "START") {
        await handleStart(context);
      } else if (label === "CAT") {
        await handleCategory(context);
      } else if (label === "SUBCAT") {
        await handleSubCategory(context);
      } else if (label === "LIST") {
        await handleList(context);
      } else if (label === "DETAIL") {
        await handleDetail(context);
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
