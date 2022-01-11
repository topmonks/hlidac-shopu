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

let stats = {};
const processedIds = new Set();

const web = "https://www.benu.cz";

async function enqueuRequests(requestQueue, items, forefront) {
  for (const item of items) {
    await requestQueue.addRequest(item, { forefront });
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
  await enqueuRequests(requestQueue, productsOnPage, false);
  return productsOnPage;
}

function parseScriptJson($, element) {
  return $(element)
    .map((i, el) => $(el).html())
    .get()
    .toString()
    .trim();
}

async function handleSingleDetailOfProduct($, request, requestQueue, stats) {
  try {
    const $jsonData = JSON.parse(
      parseScriptJson($, $("#snippet-productRichSnippet-richSnippet"))
    );
    const { offers } = $jsonData;
    const currentPrice = offers.price;
    const originalPrice = parseFloat(
      $("#product-detail .buy-box__price-head del")
        .text()
        .replace("Kč", "")
        .replace(/\s/g, "")
        .trim()
    );
    const result = {
      itemId: $jsonData.identifier,
      itemName: $jsonData.name,
      itemUrl: $jsonData.url,
      img: $jsonData.image,
      currentPrice,
      identifierSUKL: $('th:contains("Kód SÚKL:")').siblings().text(),
      originalPrice: originalPrice ? originalPrice : null,
      url: $jsonData.url,
      category: Array.from(
        $("ol#breadcrumb > li > a").map((i, el) => $(el).text())
      ),
      discounted: originalPrice ? currentPrice < originalPrice : false
    };
    if (!processedIds.has(result.itemId)) {
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
      stats.items++;
    } else {
      stats.itemsDuplicity++;
    }
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
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  if (type === "BF") {
    await requestQueue.addRequest({
      url: "https://www.benu.cz/black-friday",
      userData: {
        label: LABELS.PAGE
      }
    });
    stats.categories++;
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: "https://www.benu.cz/alavis-maxima-triple-blend-extra-silny-700-g",
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.DETAIL
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

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxRequestRetries,
    maxConcurrency,
    proxyConfiguration,
    handlePageFunction: async ({ $, request }) => {
      if (request.userData.label === LABELS.START) {
        log.info("START scraping benu.cz");
        const allCategories = new Set();
        let categories = $("div.submenu li:not(.title) > a");
        if (type === "TEST") {
          log.info("type === TEST");
          categories = categories.slice(0, 1);
        }
        categories.each(function () {
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
        stats.categories += allCategories.size;
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
          stats.pages += paginationPage.length;
          await enqueuRequests(requestQueue, paginationPage, true);
        }
      } else if (request.userData.label === LABELS.PAGI_PAGE) {
        log.info(`START with page ${request.url}`);
        await handleProducts($, request, requestQueue);
      } else if (request.userData.label === LABELS.DETAIL) {
        log.info(`START with product ${request.url}`);
        await handleSingleDetailOfProduct($, request, requestQueue, stats);
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
  log.info("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "benu.cz");
    log.info("invalidated Data CDN");

    await uploadToKeboola(type === "BF" ? "benu_cz_bf" : "benu_cz");
    log.info("upload to Keboola finished");
  }
});
