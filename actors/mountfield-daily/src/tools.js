const Apify = require("apify");
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const { COUNTRY, WEB, WEB_SK, BF } = require("./const");
const { log } = Apify.utils;

function parsePrice(text) {
  return parseFloat(
    text
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace(",", ".")
      .trim()
  );
}

async function extractItems($, $products, userData) {
  const { s3 } = global;
  const { country = COUNTRY.CZ } = global.userInput;
  const category = [];
  $(".box-breadcrumb__item").each(function () {
    category.push($(this).text().trim());
  });
  const requests = [];
  log.info(`*********** FOUND ${$products.length} items *****************`);
  for (const product of $products.toArray()) {
    const result = {};
    const $item = $(product);
    const itemUrl = $item.find(" > a").attr("href");
    const splitUrl = itemUrl.split("-");
    const itemCode = splitUrl[splitUrl.length - 1];
    const name = $item.find("h2").text()?.trim();

    const $actionPriceSpan = $item.find(
      ".list-products__item__info__price__item--main"
    );
    $actionPriceSpan.find("span").remove();
    const actionPrice = $actionPriceSpan.text();
    const $retailPriceSpan = $item.find(
      ".list-products__item__info__price__item--old"
    );
    $retailPriceSpan.find("span").remove();
    const retailPrice = $retailPriceSpan.text();

    result.currentPrice = parsePrice(actionPrice);
    result.originalPrice = parsePrice(retailPrice);

    result.discounted = false;
    if (
      (result.originalPrice !== -1 || result.originalPrice !== null) &&
      result.originalPrice > result.currentPrice
    ) {
      result.discounted = true;
    }

    result.id = itemCode;
    result.itemUrl = itemUrl;
    result.itemId = itemCode;
    result.itemName = name;
    result.category = category.join(" > ");
    result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";
    if ($item.find("img").length !== 0) {
      result.img = $item.find("img").data("src");
    }
    requests.push(
      Apify.pushData(result),
      !global.userInput.development
        ? uploadToS3(
            s3,
            `mountfield.${country.toLowerCase()}`,
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
        : null
    );
  }
  await Promise.allSettled(requests);
}

/**
 * @param {CheerioSelector} $
 * @param {Apify.Request} request
 * @param {string} rootUrl
 * @returns {Promise<*[]>}
 */
async function scrapProducts($, request) {
  const $products = $(".list-products__item__in");
  if ($products.length > 0) {
    await extractItems($, $products, request.userData);
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
  let tableName = `mountfield_${country.toLowerCase()}`;
  if (type === BF) {
    tableName = `${tableName}_bf`;
  }
  return tableName;
};

module.exports = {
  extractItems,
  scrapProducts,
  getRootUrl,
  getTableName
};
