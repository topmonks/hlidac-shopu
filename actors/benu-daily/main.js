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

const { log } = Apify.utils;
const randomUA = require("modern-random-ua");

const LABELS = {
  START: "START",
  HOME: "HOME",
  PAGE: "PAGE",
  DETAIL: "DETAIL",
  CATEGORY: "CATEGORY",
  PAGI_PAGE: "PAGI_PAGE"
};

const web = "https://www.benu.cz";

async function enqueuRequests(requestQueue, items) {
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}

async function extractItems($, $products, breadCrumbs, requestQueue) {
  const productsOnPage = [];
  $products.each(async function () {
    const $spc = $(this).find("div.spc");
    const url = `${web}${$spc.find("a.detail").attr("href")}`;
    productsOnPage.push({
      url,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.DETAIL
      }
    });
  });
  await enqueuRequests(requestQueue, productsOnPage, true);
  return productsOnPage;
}

function parseScriptJson($, element) {
  return $(element)
    .map((i, el) => $(el).html())
    .get()
    .toString()
    .trim();
}

async function handleSingleDetailOfProduct($, request) {
  try {
    const $jsonData = JSON.parse(
      parseScriptJson($, $("#snippet-productRichSnippet-richSnippet"))
    );
    const { offers } = $jsonData;
    const result = {
      itemId: $jsonData.identifier,
      itemName: $jsonData.name,
      itemUrl: $jsonData.url,
      img: $jsonData.image,
      currentPrice: offers.price,
      identifierSUKL: $('th:contains("Kód SÚKL:")').siblings().text(),
      originalPrice: $("#product-detail .buy-box__price-head del")
        .text()
        .replace("Kč", "")
        .trim(),
      url: $jsonData.url,
      category: Array.from(
        $("ol#breadcrumb > li > a").map((i, el) => $(el).text())
      ),
      discounted: offers.itemCondition === "Akce"
    };

    await uploadToS3(
      s3,
      "benu.cz",
      await s3FileName(result),
      "jsonld",
      toProduct(
        {
          ...result,
          inStock: true
        },
        { priceCurrency: "CZK" }
      )
    );

    await Apify.pushData(result);
  } catch (e) {
    throw new Error(
      `Failed extraction of item details ${request.url} - ${e.message}`
    );
  }
}

async function handleProducts($, request, requestQueue) {
  const $products = $("ul.products > li");
  if ($products.length > 0) {
    try {
      const breadCrumbs = [];
      $("ol#breadcrumb > li").each(function () {
        const i = $(this).find("li");
        if (i.length === 0) {
          breadCrumbs.push(
            $(this).text().trim().replace(" /", "").replace(":", "")
          );
        }
      });
      const actualCrumb = $("ol#breadcrumb > li > a");
      if (actualCrumb.length > 0) {
        breadCrumbs.push(actualCrumb.text().trim());
      }
      const products = await extractItems(
        $,
        $products,
        breadCrumbs,
        requestQueue
      );
      log.info(`Found ${products.length} products`);
    } catch (e) {
      throw new Error(
        `Failed extraction of item details ${request.url} - ${e.message}`
      );
    }
  }
}

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const { type } = input;
  const requestQueue = await Apify.openRequestQueue();
  if (type === "BF") {
    await requestQueue.addRequest({
      url: "https://www.benu.cz/black-friday",
      userData: {
        label: LABELS.PAGE
      }
    });
  } else {
    await requestQueue.addRequest({
      url: web,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.START
      }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration();

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency: 10,
    proxyConfiguration,
    handlePageFunction: async ({ $, request }) => {
      if (request.userData.label === LABELS.START) {
        log.info("START scrapping benu.cz");
        const allCategories = new Set();
        $("div.submenu li:not(.title) > a").each(function () {
          // $('div.submenu > ul.level-3.reset > li:not(.title):not(.goto)')
          const $link = $(this).attr("href");
          let url = `${web}${$(this).attr("href")}`;
          if ($link.includes("https")) {
            url = $link;
          }
          allCategories.add({
            url,
            headers: {
              userAgent: randomUA.generate()
            },
            userData: {
              label: LABELS.PAGE,
              mainCategory: $(this).text().trim()
            }
          });
        });
        log.info(`Found ${allCategories.size} allCategories.`);
        await enqueuRequests(requestQueue, allCategories, false);
      } else if (request.userData.label === LABELS.PAGE) {
        log.info(`START with page ${request.url}`);
        let maxPage = 0;
        $("p.paging a").each(function () {
          if (!$(this).hasClass("next") && !$(this).hasClass("ico-arr-right")) {
            maxPage = $(this).text().trim();
          }
        });
        await handleProducts($, request, requestQueue);
        if (maxPage !== 0) {
          const paginationPage = [];
          for (let i = 2; i <= maxPage; i++) {
            paginationPage.push({
              url: `${request.url}?page=${i}`,
              headers: {
                userAgent: randomUA.generate()
              },
              userData: {
                label: LABELS.PAGI_PAGE,
                mainCategory: request.userData.mainCategory,
                category: request.userData.category
              }
            });
          }
          log.info(`Found ${paginationPage.length} pages in category.`);
          await enqueuRequests(requestQueue, paginationPage, false);
        }
      } else if (request.userData.label === LABELS.PAGI_PAGE) {
        log.info(`START with page ${request.url}`);
        await handleProducts($, request, requestQueue);
      } else if (request.userData.label === LABELS.DETAIL) {
        log.info(`START with product ${request.url}`);
        await handleSingleDetailOfProduct($, request, requestQueue);
        log.info(`END with product ${request.url}`);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "benu.cz");
  log.info("invalidated Data CDN");
  await uploadToKeboola("benu_cz");
  log.info("upload to Keboola finished");

  log.info("crawler finished");
});
