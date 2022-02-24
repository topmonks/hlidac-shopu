const {
  cleanPriceText,
  cleanUnitPriceText,
  uploadToS3v2
} = require("@hlidac-shopu/actors-common/product.js");

const Apify = require("apify");
const { contains } = require("cheerio");
const { URL } = require("url");

const {
  utils: { log }
} = Apify;

const HOST = "https://www.iglobus.cz";

const listUrl = x => `${HOST}${x}/core?razeni=cena&strana=0`;
const productUrl = x => `${HOST}${x}`;
const canonicalUrl = x => new URL(x, HOST);

exports.handleStart = async ({ request, $ }, crawlContext) => {
  const { requestQueue, processedIds, stats, development } = crawlContext;
  const listLinks = $("#categories a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  for (const link of listLinks) {
    await requestQueue.addRequest({
      url: listUrl(link),
      userData: {
        label: "LIST",
        page: 0,
        category: link.replace("/", "").replaceAll("-", " ")
      }
    });
  }
  stats.categories = listLinks.length;
  log.info(`Found ${listLinks.length}x categories`);
};

exports.handleList = async ({ request, $ }, crawlContext) => {
  // Handle pagination
  const { url, userData } = request;
  const { requestQueue, processedIds, stats, development } = crawlContext;
  stats.pages++;
  if (userData.page === 0) {
    const paginationLinks = $(".pagination .page-link")
      .map(function () {
        return parseInt($(this).text().trim());
      })
      .get();
    if (paginationLinks.length > 0) {
      //get last pagination page
      const lastPaginationPage = paginationLinks[paginationLinks.length - 2];
      for (let i = 1; i < lastPaginationPage; i++) {
        const newUrl = canonicalUrl(url);
        newUrl.searchParams.set("strana", i.toString());
        userData.page = i;
        await requestQueue.addRequest(
          {
            url: newUrl.href,
            userData
          },
          { forefront: true }
        );
      }
    }
  }
  // Handle products on list
  const $products = $(".products article.product-wrap");
  try {
    const products = await extractItems($, $products, userData.category);
    // we don't need to block pushes, we will await them all at the end
    const requests = [];
    for (const product of products) {
      if (!processedIds.has(product.itemId)) {
        processedIds.add(product.itemId);
        requests.push(Apify.pushData(product), uploadToS3v2(product, {}));
        stats.items++;
      } else {
        stats.itemsDuplicity++;
      }
    }
    log.info(`Found ${requests.length / 2} unique products`);
    // await all requests, so we don't end before they end
    await Promise.allSettled(requests);
  } catch (e) {
    console.error(e);
    console.log(`Failed extraction of items. ${request.url}`);
  }
};

async function extractItems($, $products, category) {
  const itemsArray = [];
  $products.each(function () {
    const result = {};
    const $head = $(this).find(".article-head");
    const $product = $(this).find(".product-box");

    result.itemId = $(this).attr("data-stock-item-code");
    result.itemName = $head.attr("data-title");
    result.itemUrl = productUrl(
      $head.find(".product-detail-link").attr("href")
    );
    result.img = $head.find(".img-fluid").eq(0).attr("src");
    const currentPrice = $product.find(".product-price").text().trim();
    result.currentPrice = cleanPriceText(currentPrice);
    result.originalPrice = cleanPriceText(
      $product.find(".product-price-before").text().trim()
    );
    result.currentUnitPrice = cleanUnitPriceText(
      $product.find(".product-price-unit").text().trim()
    );
    result.useUnitPrice = currentPrice.includes("cca");
    result.discounted = result.currentPrice < result.originalPrice;
    result.currency = "CZK";
    result.instStock = $head.attr("data-availability") === "skladem";
    result.category = category;
    itemsArray.push(result);
  });
  return itemsArray;
}
