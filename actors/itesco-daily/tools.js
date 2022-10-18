import {
  cleanPrice,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import Apify from "apify";
import { COUNTRY } from "./consts.js";

const { log } = Apify.utils;

function flat(array) {
  let result = [];
  array.forEach(a => {
    result.push(a);
    if (Array.isArray(a.children)) {
      result = result.concat(flat(a.children));
    }
  });
  return result;
}

export async function findArraysUrl(urlsCatHtml, country) {
  const resultArrUrls = [];
  const { navList } = urlsCatHtml.taxonomy;
  const childrenArr = [];
  flat(navList).map(item => {
    if (item.children) {
      for (const url of item.children) {
        childrenArr.push(url);
      }
    }
  });
  let arr = [].concat(childrenArr);
  arr = arr.map(item => {
    if (item.url.includes("/all")) {
      return item.url;
    } else {
      return item.allUrl;
    }
  });

  const url =
    country === COUNTRY.CZ
      ? "https://nakup.itesco.cz/groceries/cs-CZ/shop"
      : "https://potravinydomov.itesco.sk/groceries/sk-SK/shop";
  arr.map(item => {
    resultArrUrls.push({
      url: `${url}${item}`
    });
  });
  return resultArrUrls;
}

/**
 * @param {int} productId
 * @param {Object} reduxResults
 */
function getProductRedux(productId, reduxResults) {
  try {
    const objReduxResults = Object.fromEntries(reduxResults);
    if (objReduxResults[productId.toString()]) {
      const { product } = objReduxResults[productId.toString()];
      if (product) {
        return product;
      }
    }
    return null;
  } catch (e) {
    log.info(e.message);
    return null;
  }
}

export async function extractItems({
  $,
  country,
  uniqueItems,
  stats,
  request,
  s3
}) {
  const itemsArray = [];
  const rootUrl =
    country === COUNTRY.CZ
      ? "https://nakup.itesco.cz"
      : "https://potravinydomov.itesco.sk";
  const category = [];
  if ($(".breadcrumbs ol li")) {
    $(".breadcrumbs ol li").each(function () {
      if ($(this).text() !== "") {
        category.push($(this).text());
      }
    });
  }

  const body = $("body");
  const reduxData = JSON.parse(body.attr("data-redux-state"));
  let resultsData = null;
  if (reduxData) {
    try {
      const { results } = reduxData;
      stats.offers += results.count;
      const { pages } = reduxData.results;
      //Use filter on paginated pages that includes null elements in pages array
      const filteredPages = pages.filter(Boolean);
      const [result] = filteredPages;
      const { serializedData } = result;
      resultsData = serializedData;
    } catch (e) {
      log.error(e);
    }
  }

  if ($(".product-list--list-item")) {
    $(".product-list--list-item").each(async function () {
      const result = {
        currency: country === COUNTRY.CZ ? "CZK" : "EUR"
      };
      result.category = category;
      /* results.categories = category; */
      if (parseInt($(this).find(".tile-content"))) {
        result.itemId = parseInt(
          $(this).find(".tile-content").attr("data-auto-id")
        );
      } else if ($(this).find("a.product-image-wrapper")) {
        result.itemId = parseInt(
          $(this)
            .find("a.product-image-wrapper")
            .attr("href")
            .replace(/^.+products\//, "")
        );
      }
      if ($(this).find(".product-image-wrapper")) {
        result.itemUrl = `${rootUrl}${$(this)
          .find(".product-image-wrapper")
          .attr("href")}`;
      }

      const productRedux = getProductRedux(result.itemId, resultsData);
      result.itemName = productRedux.title;

      const promotionProduct = $(this).find(
        ".product-details--wrapper .offer-text"
      );
      if (promotionProduct) {
        const offer = promotionProduct.text();
        if (country === COUNTRY.CZ) {
          result.discounted = !!offer;
          const currentPriceRaw = offer.includes("Clubcard")
            ? offer.split("běžná cena")[0]
            : offer.split("nyní")[1];
          result.currentPrice =
            offer !== ""
              ? cleanPrice(currentPriceRaw)
              : cleanPrice($(this).find(".beans-price__text").text());
          result.originalPrice =
            offer !== ""
              ? cleanPrice(offer.replace(/^.+cena|nyní.+/g, ""))
              : null;
        } else {
          result.currentPrice =
            offer !== ""
              ? cleanPrice(offer.split("teraz")[1])
              : cleanPrice($(this).find(".beans-price__text").text());
          const match = offer.match(/(predtým) ([\d+|,]+)/);
          if (match && match.length === 3) {
            result.originalPrice = cleanPrice(match[2]);
          }
          result.discounted = result.originalPrice !== undefined;
        }
        result.currentUnitPrice = cleanPrice(
          $(this).find(".beans-price__subtext").text()
        );
        result.useUnitPrice =
          $(this).find(".beans-radio-button-with-label__label").length !== 0;
        result.originalUnitPrice = result.useUnitPrice
          ? result.originalPrice
          : null;
      }

      result.img = productRedux.defaultImageUrl;
      result.inStock = productRedux.status === "AvailableForSale";

      if ($(this).find(".weightedProduct-text").length !== 0) {
        const unitOfMeasure = $(this)
          .find(".weightedProduct-text")
          .text()
          .trim();
        if (unitOfMeasure === "0.1kg" && result.discounted) {
          result.currentPrice /= 10;
          result.originalPrice /= 10;
        }
        result.unitOfMeasure = unitOfMeasure;
      }
      if (!uniqueItems.has(result.itemId)) {
        uniqueItems.add(result.itemId);
        itemsArray.push(result);
        await uploadToS3v2(s3, result);
      }
    });
  }

  log.info(`Storing ${itemsArray.length} for ${request.url}`);
  return itemsArray;
}
