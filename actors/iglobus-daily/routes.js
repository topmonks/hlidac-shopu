const Apify = require("apify");
const { contains } = require("cheerio");

const {
  utils: { log }
} = Apify;

exports.handleStart = async ({ request, $ }) => {
  const requestQueue = await Apify.openRequestQueue();
  const pseudoUrls = [new Apify.PseudoUrl("https://www.iglobus.cz/[.*]")];

  Apify.utils.enqueueLinks({
    $,
    baseUrl: "https://www.iglobus.cz",
    selector: "#categories a",
    pseudoUrls,
    requestQueue,
    userData: { label: "LIST" }
  });
};

exports.handleList = async ({ request, $ }) => {
  // Handle pagination
  const requestQueue = await Apify.openRequestQueue();
  const pseudoUrls = [new Apify.PseudoUrl("https://www.iglobus.cz/[.*]")];
  Apify.utils.enqueueLinks({
    $,
    baseUrl: request.url.split("?")[0],
    selector: "a.page-link",
    pseudoUrls,
    requestQueue,
    userData: { label: "LIST" }
  });

  // add details
  for (link of $(".article-head")
    .map(function () {
      return $(this).find("a").attr("href");
    })
    .get()) {
    requestQueue.addRequest({
      url: `https://www.iglobus.cz${link}`,
      userData: { label: "DETAIL" }
    });
  }

  // Apify.utils.log.info(request.url);
  // enque details pages
};

exports.handleDetail = async ({ request, $ }) => {
  // Handle details
  const result = {};
  result.itemId = $("#detail-container").attr("data-stock-item-code");
  result.itemName = $("h1").eq(0).text();
  result.itemImgUrl = $("#detail-container").find("img").attr("src");
  result.itemCategoryPage = $(".breadcrumb li")
    .map(function () {
      return $(this).text().trim();
    })
    .get()
    .join("=>");
  result.itemUrl = request.url;
  const price = $(".detail-price-now").text();
  if (price.includes("cca")) {
    result.currentPrice = parseFloat(price.split("cca")[1].replace(",", "."));
  } else {
    result.currentPrice = parseFloat(price.replace(",", "."));
  }
  const discount = parseInt(
    $(".product-discount strong").eq(0).text().replace("−", "")
  );
  if (discount) {
    result.originalPrice =
      Math.round(((result.currentPrice * 100) / (100 - discount)) * 10) / 10;
  } else {
    result.originalPrice = result.currentPrice;
  }
  // result.originalPrice = parseFloat($('.detail-price-before').text().replace(',', '.'));
  // if (!result.originalPrice) result.originalPrice = result.currentPrice;
  result.discounted = result.currentPrice < result.originalPrice;
  result.currency = "CZK";

  Apify.pushData(result);
};
