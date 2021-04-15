const Apify = require("apify");

const { log } = Apify.utils;
const { COUNTRY } = require("./consts");

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
const findArraysUrl = async (urlsCatHtml, country) => {
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
};

const formatPrice = string => {
  return parseFloat(string.replace(/,/, "."));
};

/**
 * @param {int} productId
 * @param {Object} reduxResults
 */
const getProductImage = (productId, reduxResults) => {
  try {
    if (reduxResults[productId]) {
      const {
        serializedData: { product }
      } = reduxResults[productId];
      if (product) {
        return product.defaultImageUrl;
      }
    }
    return null;
  } catch (e) {
    log.info(e.message);
    return null;
  }
};

/**
 * @param {CheerioSelector} $
 * @param {COUNTRY.CZ|COUNTRY.SK} country
 * @returns {Promise<[]>}
 * @constructor
 */
async function ExtractItems($, country, uniqueItems, stats, request) {
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
    $(".product-list--list-item").each(function () {
      const result = {
        currency: country === COUNTRY.CZ ? "Kč" : "Eur"
      };
      result.category = category;
      /* results.categories = category; */
      if ($(this).find("h3")) {
        result.itemName = $(this).find("h3").text().trim();
      }
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
      const promotionProduct = $(this).find(".product-promotion .offer-text");
      if (promotionProduct) {
        const offer = promotionProduct.text();
        if (country === COUNTRY.CZ) {
          result.discounted = !!offer;
          result.currentPrice =
            offer !== ""
              ? formatPrice(offer.split("nyní")[1])
              : formatPrice(
                  $(this).find(".price-control-wrapper").text().split(" ")[0]
                );
          result.originalPrice =
            offer !== ""
              ? formatPrice(offer.replace(/^.+cena|nyní.+/g, ""))
              : null;
        } else {
          result.currentPrice =
            offer !== ""
              ? formatPrice(offer.split("teraz")[1])
              : formatPrice(
                  $(this).find(".price-control-wrapper").text().split(" ")[0]
                );
          const match = offer.match(/(predtým) ([\d+|,]+)/);
          if (match && match.length === 3) {
            result.originalPrice = formatPrice(match[2]);
          }
          result.discounted = result.originalPrice !== undefined;
        }
      }

      result.img = getProductImage(result.itemId, resultsData);

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
      }
    });
  }

  log.info(`Storing ${itemsArray.length} for ${request.url}`);
  return itemsArray;
}

module.exports = {
  flat,
  ExtractItems,
  findArraysUrl,
  formatPrice,
  getProductImage
};
