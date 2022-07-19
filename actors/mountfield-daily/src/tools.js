import Apify from "apify";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { COUNTRY, WEB, WEB_SK } from "./const.js";

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

async function extractItems({ $, $products, s3, userInput }) {
  const { country = COUNTRY.CZ } = userInput;
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
      !userInput.development
        ? uploadToS3v2(s3, result, {
            priceCurrency: result.currency,
            inStock: true
          })
        : null
    );
  }
  await Promise.all(requests);
}

export async function scrapProducts({ $, s3, userInput }) {
  const $products = $(".list-products__item__in");
  if ($products.length > 0) {
    await extractItems({ $, $products, s3, userInput });
  }
}

/**
 * create rootURL of mountfield site
 * @return {string}
 */
export const getRootUrl = userInput => {
  const { country = COUNTRY.CZ } = userInput;
  return country === COUNTRY.CZ ? WEB : WEB_SK;
};

/**
 * return name of the table in keboola according the language
 * @return {string|string}
 */
export const getTableName = userInput => {
  const { type, country = COUNTRY.CZ } = userInput;
  let tableName = `mountfield_${country.toLowerCase()}`;
  if (type === ActorType.BF) {
    tableName = `${tableName}_bf`;
  }
  return tableName;
};
