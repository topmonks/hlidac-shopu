const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

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
    requestQueue,
    selector: "#categories a",
    baseUrl: "https://www.iglobus.cz",
    pseudoUrls,
    transformRequestFunction: req => {
      req.userData.label = "LIST";
      return req;
    }
  });
};

exports.handleList = async ({ request, $ }) => {
  // Handle pagination
  const requestQueue = await Apify.openRequestQueue();
  const pseudoUrls = [new Apify.PseudoUrl("https://www.iglobus.cz/[.*]")];
  Apify.utils.enqueueLinks({
    $,
    requestQueue,
    selector: "a.page-link",
    baseUrl: request.url.split("?")[0],
    pseudoUrls,
    transformRequestFunction: req => {
      req.userData.label = "LIST";
      return req;
    }
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
  //Check if item is available
  const itemAvailability = $(".product-buy").attr("data-availability");

  //Format item detail for function toProduct()
  const detail = {};
  detail.itemId = result.itemId;
  detail.itemName = result.itemName;
  detail.itemUrl = result.itemUrl;
  detail.img = result.itemImgUrl;
  detail.category = result.itemCategoryPage;
  detail.inStock = itemAvailability === "skladem";
  detail.currentPrice = result.currentPrice;
  detail.currency = result.currency;

  await Promise.all([
    Apify.pushData(result),
    uploadToS3(
      s3,
      "iglobus.cz",
      await s3FileName(detail),
      "jsonld",
      toProduct(detail, { priceCurrency: "CZK" })
    )
  ]);
};
