const {
  splitPriceRangeToTwoRequest
} = require("./splitPriceRangeToTwoRequest.js");
const { scrapeProducts } = require("./scrapeProducts.js");
const { handlePagination } = require("./handlePagination.js");
const { MAX_PAGE_COUNT } = require("../../consts.js");

const scrapeProductsOrSplitPriceRange = async (
  $,
  url,
  requestQueue,
  userData,
  stats,
  processedIds
) => {
  // take categories from userData in case of pagination pages
  let { category } = userData;
  if (!category) {
    const categories = [];
    $(".breadcrumbs span").each((i, el) => {
      categories[i] = $(el).text()?.trim();
    });

    category = [
      ...categories,
      $(".catalog-heading").text()?.trim() // subcategory name
    ];
  }

  const minPrice = parseInt(
    $('input.slider-filter__input[formcontrolname="min"]').attr("value"),
    10
  );
  const maxPrice = parseInt(
    $('input.slider-filter__input[formcontrolname="max"]').attr("value"),
    10
  );

  // Scrape products already if their count is less than 67 pages.
  // We also give up on splitting price ranges if minPrice already equals maxPrice.
  if (
    !$(".pagination").length ||
    parseInt($("li.pagination__item:last-child").text(), 10) < MAX_PAGE_COUNT ||
    minPrice === maxPrice
  ) {
    await scrapeProducts($, category, stats, processedIds);
    await handlePagination($, url, requestQueue, userData);
    return;
  }

  await splitPriceRangeToTwoRequest(
    url,
    minPrice,
    maxPrice,
    requestQueue,
    userData
  );
};

module.exports = {
  scrapeProductsOrSplitPriceRange
};
