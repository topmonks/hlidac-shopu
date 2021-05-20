const Apify = require("apify");

const { log } = Apify.utils;
const BF = "BF";

const web = "https://www.kasa.cz";
const limit = "limit=96";
const akce = "akce";
const aktuality = "aktuality";
const bazar = "bazar";
const LAST_CATEGORY = "LAST_CATEGORY";

async function extractItems($, $products, breadcrum) {
  const itemsArray = [];
  $products.each(function () {
    const result = {};
    const $item = $(this);
    const $link = $(this).find(".product-box-link");
    const itemId = $link.data("productId");
    let isBazar = false;
    $item.find(".labels > .label-red").each(function () {
      if ($(this).text().trim() === bazar) {
        isBazar = true;
      }
    });
    if (parseInt(itemId) > 0 || !isBazar) {
      const name = $item.find("h2.product-box-title").text().trim();
      const itemUrl = $link.attr("href");
      const $actualPriceSpan = $item.find("p.main-price");
      const $oldPriceSpan = $item.find("div.before-price span.text-strike");
      const $itemImgUrl = $item.find(".product-box-thumb img");

      if ($oldPriceSpan.length > 0) {
        result.originalPrice = parseFloat(
          $oldPriceSpan.text().replace("Kč", "").replace(" ", "").trim()
        );
        result.currentPrice = parseFloat(
          $actualPriceSpan.text().replace("Kč", "").replace(" ", "").trim()
        );
        result.discounted = true;
      } else {
        result.currentPrice = parseFloat(
          $actualPriceSpan.text().replace("Kč", "").replace(" ", "").trim()
        );
        result.originalPrice = null;
        result.discounted = false;
      }
      result.img = $itemImgUrl.attr("src");
      result.itemId = itemId;
      result.itemUrl = `${web}${itemUrl}`;
      result.itemName = name;
      result.category = breadcrum.join(" > ");
      itemsArray.push(result);
    }
  });
  return itemsArray;
}

async function enqueuRequests(requestQueue, items) {
  for (const item of items) {
    await requestQueue.addRequest(item);
  }
}

async function handleProducts($, request) {
  const breadCrums = [];
  $(".col-main-content-right > ol.breadcrumb > li").each(function () {
    breadCrums.push($(this).text().trim());
  });
  const $products = $(".product-boxes article.product-box");
  if ($products.length > 0) {
    try {
      const products = await extractItems($, $products, breadCrums);
      log.info(`Found ${products.length} products`);
      await Apify.pushData(products);
    } catch (e) {
      console.log(`Failed extraction of items. ${request.url}`);
    }
  }
}

async function handleCategories($, categories, requestQueue) {
  const subCategories = [];
  const lastCategories = [];
  categories.each(function () {
    if (!$(this).hasClass("is-extra")) {
      const link = $(this).find("> a");
      const href = link.attr("href");
      const menuItemId = $(this).attr("id");
      if ($(this).hasClass("last-category")) {
        lastCategories.push({
          url: `${web}${href}?${limit}`,
          userData: {
            label: LAST_CATEGORY
          }
        });
      } else {
        subCategories.push({
          url: `${web}${href}`,
          userData: {
            label: "SUB_CATEGORY",
            categoryMenuId: menuItemId
          }
        });
      }
    }
  });
  log.info(`Found ${subCategories.length} subCategories.`);
  await enqueuRequests(requestQueue, subCategories);
  log.info(`Found ${lastCategories.length} lastCategories.`);
  await enqueuRequests(requestQueue, lastCategories);
}

Apify.main(async () => {
  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 2,
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};
  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();

  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  if (type === BF) {
    await requestQueue.addRequest({
      url: "https://www.kasa.cz/black-friday",
      userData: {
        label: BF
      }
    });
  } else if (type === "FULL") {
    await requestQueue.addRequest({
      url: web,
      userData: {
        label: "START"
      }
    });
  }

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    handlePageFunction: async ({ $, request }) => {
      if (request.userData.label === "START") {
        log.info("START scrapping Kasa.cz");
        const mainCategories = [];
        $(".main-content .col-sidebar-left ul.main-menu-nav > li").each(
          function () {
            const link = $(this).find("> a");
            const href = link.attr("href");
            if (!href.includes(akce) && !href.includes(aktuality)) {
              mainCategories.push({
                url: `${web}${href}`,
                userData: {
                  label: "MAIN_CATEGORY"
                }
              });
            }
          }
        );
        log.info(`Found ${mainCategories.length} mainCategories.`);
        await enqueuRequests(requestQueue, mainCategories);
      } else if (request.userData.label === "MAIN_CATEGORY") {
        log.info(`START with main category ${request.url}`);
        const categories = $("ul.sidebar-menu-tree > li");
        await handleCategories($, categories, requestQueue);
      } else if (request.userData.label === "SUB_CATEGORY") {
        log.info(`START with sub category ${request.url}`);
        const $items = $(`#${request.userData.categoryMenuId} > ul > li`);
        await handleCategories($, $items, requestQueue);
      } else if (request.userData.label === LAST_CATEGORY) {
        log.info(`START with last category ${request.url}`);
        // pagination
        let maxPage = 0;
        const nextSteps = $("li.step.next").prev();
        nextSteps.each(function () {
          maxPage = $(this).find("> a").text();
        });
        await handleProducts($, request);
        if (maxPage !== 0) {
          const pagiPages = [];
          for (let i = 2; i <= maxPage; i++) {
            pagiPages.push({
              url: `${request.url}&strana=${i}`,
              userData: {
                label: "LAST_CATEGORY_PAGE"
              }
            });
          }
          console.info(`Found ${pagiPages.length} category pages`);
          await enqueuRequests(requestQueue, pagiPages);
        }
      } else if (request.userData.label === "LAST_CATEGORY_PAGE") {
        log.info(`START with page ${request.url}`);
        await handleProducts($, request);
      } else if (request.userData.label === BF) {
        log.info(`START BF ${request.url}`);
        const categories = [];
        $(".html_obsah .wsw > div > a").each(function () {
          if (!$(this).attr("href").includes("doprava")) {
            categories.push({
              url: `${web}${$(this).attr("href")}?${limit}`,
              userData: {
                label: "LAST_CATEGORY"
              }
            });
          }
        });
        log.info(`Found ${categories.length} BF categories`);
        await enqueuRequests(requestQueue, categories);
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

  // Run crawler.
  await crawler.run();

  console.log("crawler finished");
  /*
  try {
    const env = await Apify.getEnv();
    const run = await Apify.call(
      "blackfriday/uploader",
      {
        datasetId: env.defaultDatasetId,
        upload: true,
        actRunId: env.actorRunId,
        blackFriday: type !== "FULL",
        tableName: type !== "FULL" ? "kasa_bf" : "kasacz"
      },
      {
        waitSecs: 25
      }
    );
    console.log(`Keboola upload called: ${run.id}`);
  } catch (e) {
    console.log(e);
  }
*/
  console.log("Finished.");
});
