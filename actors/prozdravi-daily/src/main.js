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
const randomUA = require("modern-random-ua");

const { log } = Apify.utils;

const LABELS = {
  START: "START",
  BF: "BF",
  HOME: "HOME",
  PAGE: "PAGE",
  DETAIL: "DETAIL",
  CATEGORY: "CATEGORY",
  PAGI_PAGE: "PAGI_PAGE"
};

const web = "https://www.prozdravi.cz";

async function enqueuRequests(requestQueue, items) {
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}
async function extractItems(
  $,
  $products,
  breadCrumbs,
  requestQueue,
  uniqueProducts
) {
  const productsOnPage = [];
  $products.each(async function () {
    const $link = $(this).find("a.product-card-link");
    const $url = /prozdravi/.test($(this).attr("href"))
      ? "$link.attr('href')"
      : `${web}${$link.attr("href")}`;
    let oldPrice = $(this).find(".old-price").text();
    if (oldPrice) {
      oldPrice = parseInt(oldPrice.replace(/[Kč|\s]/g, "").trim(), 10);
    }
    const price = $(this).data("metric1");
    const itemId = $(this).data("code");
    if (!uniqueProducts.has(itemId)) {
      const result = {
        itemName: $link.attr("title"),
        itemId: $(this).data("code"),
        itemUrl: $url,
        description: $(this).find(".product-card__description").text().trim(),
        img: $(this).find("img").data("src"),
        category: Array.from(
          $("div.breadcrumb ul li").map((i, el) => $(el).text().trim())
        ),
        currentPrice: price,
        originalPrice: oldPrice || null,
        discounted: !!oldPrice
      };
      productsOnPage.push(result);
      uniqueProducts.add(itemId);
    }
  });
  // await enqueuRequests(requestQueue, productsOnPage, true);
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
      parseScriptJson($, $('script[type="application/ld+json"]'))
    );
    const { offers } = $jsonData;
    const discountField = $("span.product-prices-block__backup-price");
    const result = {
      itemId: $('.product-master-data input[name="productCode"]').attr("value"),
      itemName: $jsonData.name,
      itemUrl: offers.url.replace(
        "https://www.prozdravi.czhttps://www.prozdravi.cz",
        "https://www.prozdravi.cz"
      ),
      description: $jsonData.description,
      img: $jsonData.image,
      currentPrice: offers.price,
      originalPrice: discountField.text().replace("Kč", "").trim(),
      category: Array.from(
        $("div.breadcrumb ul li").map((i, el) => $(el).text().trim())
      ),
      discounted: discountField.length > 0
    };
    await uploadToS3(
      s3,
      "prozdravi.cz",
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
    log.error(`Failed extraction of item details. ${request.url}`);
  }
}

async function handleProducts($, request, requestQueue, uniqueProducts, stats) {
  const $products = $("div.product-card");
  if ($products.length > 0) {
    try {
      const breadCrumbs = Array.from(
        $("div.breadcrumb ul li").map((i, el) => $(el).text().trim())
      );
      const products = await extractItems(
        $,
        $products,
        breadCrumbs,
        requestQueue,
        uniqueProducts
      );
      log.debug(`Found ${products.length} products`);
      stats.done += products.length;

      for (const product of products) {
        await uploadToS3(
          s3,
          "prozdravi.cz",
          await s3FileName(product),
          "jsonld",
          toProduct(
            {
              ...product,
              inStock: true
            },
            { priceCurrency: "CZK" }
          )
        );
      }

      await Apify.pushData(products);
    } catch (e) {
      console.error(e);
      log.error(`Failed extraction of items. ${request.url}`);
    }
  }
}

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const { test, debugLog = false, type } = input;
  const requestQueue = await Apify.openRequestQueue();
  const stats = (await Apify.getValue("STATS")) || { done: 0 };
  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  if (type === LABELS.BF) {
    await requestQueue.addRequest({
      url: "https://www.prozdravi.cz/green-friday-produkty/",
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.BF
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

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  const uniqueProducts = new Set();

  const persistState = async () => {
    // await Apify.setValue('STATS', stats).then(() => log.info('STATS saved!'));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency: 5,
    proxyConfiguration,
    handlePageFunction: async ({ $, request }) => {
      log.debug(
        `START processing [${request.userData.label}] - ${request.url}`
      );
      if (request.userData.label === LABELS.START) {
        const allCategories = new Set();
        $("a[class*='_link']").each(function () {
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
        log.debug(`Found ${allCategories.size} allCategories.`);
        await enqueuRequests(requestQueue, allCategories, true);
      } else if (request.userData.label === LABELS.BF) {
        const categories = new Set();
        $(".filter-group-content li a").each((_, el) => {
          categories.add({
            url: `${web}${$(el).attr("href")}`,
            headers: {
              userAgent: randomUA.generate()
            },
            userData: {
              label: LABELS.PAGE,
              mainCategory: $(this).text().trim()
            }
          });
        });
        log.debug(`Found ${categories.size} categories.`);
        await enqueuRequests(requestQueue, categories, true);
      } else if (request.userData.label === LABELS.PAGE) {
        const maxPage = $("span.pager a").last().text();
        await handleProducts($, request, requestQueue, uniqueProducts, stats);
        if (maxPage !== 0) {
          const paginationPage = [];
          for (let i = 1; i <= maxPage; i++) {
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
          log.debug(`Found ${paginationPage.length} pages in category.`);
          await enqueuRequests(requestQueue, paginationPage, true);
        }
      } else if (request.userData.label === LABELS.PAGI_PAGE) {
        await handleProducts($, request, requestQueue, uniqueProducts, stats);
      } else if (request.userData.label === LABELS.DETAIL) {
        await handleSingleDetailOfProduct($, request, requestQueue);
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "prozdravi.cz");
  log.info("invalidated Data CDN");
  if (!test) {
    let tableName = "prozdravi_cz";
    if (type === "BF") {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR finished");
});
