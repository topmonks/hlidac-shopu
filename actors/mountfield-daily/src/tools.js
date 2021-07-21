const Apify = require("apify");
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const { COUNTRY, WEB, WEB_SK, BF } = require("./const");
const { log } = Apify.utils;

async function extractItems($, $products, userData, rootUrl) {
  const { s3 } = global;
  const { country = COUNTRY.CZ } = global.userInput;
  const category = [];
  $(".breadcrumbs > a.CMSBreadCrumbsLink").each(function () {
    category.push($(this).text().trim());
  });
  category.push($(".CMSBreadCrumbsCurrentItem").text().trim());
  const requests = [];
  log.info(`*********** FOUND ${$products.length} items *****************`);
  for (const product of $products.toArray()) {
    const result = {};
    const $item = $(product);
    const id = $item.data("key");
    const itemUrl = $item.find("h3 a").attr("href");
    const splitUrl = itemUrl.split("-");
    const itemCode = splitUrl[splitUrl.length - 1];
    const name = $item.find("h3 a").text();
    const $basicPriceSpan = $item.find("span.basicPrice");
    if ($basicPriceSpan.length > 0) {
      $basicPriceSpan.find("span").remove();
      const retailPrice = $basicPriceSpan.text().replace(/\s/g, "").trim();

      result.currentPrice = parseFloat(retailPrice);
      result.originalPrice = null;
      result.discounted = false;
    } else {
      const $actionPriceSpan = $item.find("span.actionPrice");
      $actionPriceSpan.find("span").remove();
      const actionPrice = $actionPriceSpan.text().replace(/\s/g, "").trim();
      const $retailPriceSpan = $item.find("span.retailPrice");
      $retailPriceSpan.find("span").remove();
      const retailPrice = $retailPriceSpan.text().replace(/\s/g, "").trim();

      result.currentPrice = parseFloat(actionPrice);
      result.originalPrice = parseFloat(retailPrice);
      result.discounted = true;
    }

    result.id = id;
    result.itemUrl = `${rootUrl}${itemUrl}`;
    result.itemId = itemCode;
    result.itemName = name;
    result.category = category.join(" > ");
    result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";
    if ($item.find(".image span").length !== 0) {
      result.img = $item.find(".image span").data("image");
    }
    requests.push(
      Apify.pushData(result),
      uploadToS3(
        s3,
        "mountfield.cz",
        await s3FileName(result),
        "jsonld",
        toProduct(
          {
            ...result,
            inStock: true
          },
          { priceCurrency: result.currency }
        )
      )
    );
  }
  await Promise.all(requests);
}

/**
 * @param {CheerioSelector} $
 * @param {Apify.Request} request
 * @param {string} rootUrl
 * @returns {Promise<*[]>}
 */
async function scrapProducts($, request, rootUrl) {
  const $products = $("ul.productList li");
  if ($products.length > 0) {
    await extractItems($, $products, request.userData, rootUrl);
  }
}

/**
 * create rootURL of mountfield site
 * @return {string}
 */
const getRootUrl = () => {
  const { country = COUNTRY.CZ } = global.userInput;
  return country === COUNTRY.CZ ? WEB : WEB_SK;
};

/**
 * return name of the table in keboola according the language
 * @return {string|string}
 */
const getTableName = () => {
  const { type, country = COUNTRY.CZ } = global.userInput;
  let tableName = "mountfield";
  if (country === "SK") {
    tableName = "mountfield_sk";
  } else if (country === "CZ" && type === BF) {
    tableName = "mountfield_bf";
  }

  return tableName;
};

module.exports = {
  extractItems,
  scrapProducts,
  getRootUrl,
  getTableName
};
