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

const web = "https://www.sleky.cz";

//
// mode switch in INPUT.json
// { "mode": "DETAIL"}
// mode = 'LIST'; // prices and other attrs are taken from product list page
// mode = 'DETAIL'; // prices and other attrs are taken from product detail page

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();

  let mode = "LIST";

  if (input) {
    mode = input.mode;
  }

  log.info(`Mode is ${mode}`);
  const requestQueue = await Apify.openRequestQueue();

  await requestQueue.addRequest({
    url: web,
    headers: {},
    userData: {
      label: "START"
    }
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: false,
    groups: ["CZECH_LUMINATI"]
  });

  async function extractProductFromDetailPage($, request) {
    const itemsArray = [];
    const itemUrl = request.url;

    $(".content").each(async function () {
      const result = {};
      const $item = $(this);
      const $title = $item.find("h1");
      const name = $title
        .text()
        .trim()
        .replace(/([\n\t])/g, "");
      log.debug(`START with product ${name}`);
      if (name.length > 0) {
        const $orderbox = $item.find("form.ajaxsubmit");
        const id = $orderbox.attr("data-product-id");

        const $currentPriceStr = $orderbox.find("strong").text();
        const $originalPriceStr = $orderbox.find("dd > strike").text();

        const currentPrice = parseFloat(
          $currentPriceStr.replace("Kč", "").replace(/\s/g, "").trim()
        );
        const originalPrice = parseFloat(
          $originalPriceStr.replace("Kč", "").replace(/\s/g, "").trim()
        );

        if (isNaN(originalPrice)) {
          result.originalPrice = currentPrice;
          result.discounted = false;
        } else {
          result.originalPrice = originalPrice;
          result.discounted = true;
        }

        result.currentPrice = currentPrice;
        result.img = $item.find(".img.highslide ").attr("href");
        result.itemId = id;
        result.itemUrl = itemUrl;
        result.itemName = name;
        result.category = $item.find(".kategorie").text();
        result.vendor = $item.find(".vyrobce").find("acronym").text();
        result.indicationGroup = $item.find(".indikace").find("span").text();

        result.group = $item
          .find(".skupina")
          .text()
          .trim()
          .replace(/([\n\t])/g, "");
        result.indication = $item
          .find(".indikace")
          .text()
          .trim()
          .replace(/([\n\t\r])/g, "");

        try {
          result.SUKLId = $item
            .find(".skupina")
            .text()
            .trim()
            .replace(/([\n\t])/g, "")
            .match(/\d+$/)[0]; // assume SUKL id as last number
        } catch (err) {
          result.SUKLId = "N/A";
        }

        itemsArray.push(result);

        await uploadToS3(
          s3,
          "sleky.cz",
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

        log.debug(
          `END with product ${name}, id=${result.itemId}, price=${result.currentPrice}, SUKLId=${result.SUKLId}`
        );
      } else {
        log.info(`Skip non price product [${name}]`);
      }
    });

    await Apify.pushData(itemsArray);
    return itemsArray;
  }

  async function extractItems($, $products, breadCrumbs, requestQueue, mode) {
    const itemsArray = [];
    const productPages = [];
    $products.each(async function () {
      const result = {};
      const $item = $(this);
      const $image = $item.find("img");
      const $name = $image
        .attr("alt")
        .trim()
        .replace(/([\n\t])/g, "");

      if ($name.length > 0) {
        const itemUrl = $item.find("a").attr("href");

        if (mode === "DETAIL") {
          const detailPages = [];
          const url = `${web}${itemUrl}`;
          detailPages.push({
            url,
            userData: {
              label: "DETAIL_PAGE",
              mainCategory: $(this).text().trim()
            }
          });
          await enqueuRequests(requestQueue, detailPages);
        } else {
          const $itemImgUrl = $image.attr("src");

          const $priceBox = $item.find(".pricebox");
          const id = $priceBox.find("form").attr("data-product-id");

          const currentPriceTag = $priceBox.find("strong");
          const originalPriceTag = $priceBox.find("strike");

          const currentPrice = parseFloat(
            currentPriceTag.text().replace("Kč", "").replace(/\s/g, "").trim()
          );
          const originalPrice = parseFloat(
            originalPriceTag.text().replace("Kč", "").replace(/\s/g, "").trim()
          );

          if (isNaN(originalPrice)) {
            result.originalPrice = currentPrice;
            result.discounted = false;
          } else {
            result.originalPrice = originalPrice;
            result.discounted = true;
          }

          result.currentPrice = currentPrice;
          result.img = $itemImgUrl;
          result.itemId = id;
          result.itemUrl = `${web}${itemUrl}`;
          result.itemName = $name;
          result.category = breadCrumbs;
          if (result.itemId) {
            itemsArray.push(result);
          }
        }
      }
    });
    await enqueuRequests(requestQueue, productPages, true);
    return itemsArray;
  }

  async function enqueuRequests(requestQueue, items) {
    for (const item of items) {
      await requestQueue.addRequest(item);
    }
  }

  async function extractProductFromListPage($, request, requestQueue, mode) {
    const $products = $(".item");
    if ($products.length > 0) {
      try {
        const breadCrumbs = [];
        $(".content > h1").each(function () {
          breadCrumbs.push($(this).text().trim());
        });

        log.info(`Found ${$products.length} products`);
        const products = await extractItems(
          $,
          $products,
          breadCrumbs,
          requestQueue,
          mode
        );
        if (mode === "LIST") {
          log.info(`Extracted ${$products.length} products`);
        }

        for (const product of products) {
          await uploadToS3(
            s3,
            "sleky.cz",
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
          await Apify.pushData(product);
        }
      } catch (e) {
        log.info(`Failed extraction of items. ${request.url}`);
      }
    }
  }

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 20,

    handlePageFunction: async ({ $, request }) => {
      if (request.userData.label === "START") {
        log.info("START scraping Sleky.cz");
        const mainPages = [];
        $(".egmenu > li > a").each(function () {
          const $link = $(this).attr("href");
          let url = `${web}${$(this).attr("href")}`;
          if ($link.includes("https")) {
            url = $link;
          }
          mainPages.push({
            url,
            userData: {
              label: "PAGE",
              mainCategory: $(this).text().trim()
            }
          });
        });
        log.info(`Found ${mainPages.length} main category pages.`);
        await enqueuRequests(requestQueue, mainPages);
      } else if (request.userData.label === "PAGE") {
        log.info(`START with product list page ${request.url}`);
        let maxPage = parseInt(0);
        $(".paginator > ul > li > a").each(function () {
          const isNextPage = $(this).text().trim().includes("\u000BB"); // &raquo;
          if (!isNextPage) {
            const currentPage = parseInt($(this).text().trim());
            if (currentPage > maxPage) {
              // page list is not sorted
              maxPage = $(this).text().trim();
            }
          }
        });

        if (maxPage !== 0) {
          const paginationPage = [];
          for (let i = 1; i <= maxPage; i++) {
            paginationPage.push({
              url: `${request.url}?page=${i}`,
              headers: {},
              userData: {
                label: "PAGI_PAGE",
                mainCategory: request.userData.mainCategory,
                category: request.userData.category
              }
            });
          }
          log.info(`Found ${paginationPage.length} pages.`);
          await enqueuRequests(requestQueue, paginationPage, false);
        }
      } else if (request.userData.label === "PAGI_PAGE") {
        log.info(`START with page ${request.url}`);
        await extractProductFromListPage($, request, requestQueue, mode);
      } else if (request.userData.label === "DETAIL_PAGE") {
        log.info(`START with DETAIL page ${request.url}`);
        await extractProductFromDetailPage($, request);
      }
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "sleky.cz");
  log.info("invalidated Data CDN");
  await uploadToKeboola("sleky_cz");
  log.info("upload to Keboola finished");

  log.info("Finished.");
});
