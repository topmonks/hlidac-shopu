const Apify = require("apify");

const {
  scrapeProductsOrSplitPriceRange
} = require("./helpers/scrapeProductsOrSplitPriceRange.js");
const {
  countProductsOrSplitPriceRange
} = require("./helpers/countProductsOrSplitPriceRange.js");

const {
  ACTOR_TYPES,
  CATEGORY_LIST_ITEM_SELECTOR,
  LABELS,
  GAMER_GOODS_URL,
  RESTAURANT_GOODS_URL
} = require("../consts.js");

const { DAILY } = ACTOR_TYPES;
const {
  utils: { log }
} = Apify;

/** @type {Apify.CheerioHandlePage} */
const handleProductList = async ({
  $,
  request: { userData, loadedUrl },
  crawler: { requestQueue },
  type
}) => {
  log.info(`Entered product list page: ${loadedUrl}`);

  let maxCategoryDepth = 1;

  const categoryUrl = $(".breadcrumbs li:nth-child(2) a").attr("href")?.trim();
  const subcategoryUrl = $(".breadcrumbs li:nth-child(3) a")
    ?.attr("href")
    ?.trim();

  if (
    subcategoryUrl === GAMER_GOODS_URL ||
    categoryUrl === RESTAURANT_GOODS_URL
  ) {
    maxCategoryDepth = 2;
  }

  /**
   * If the length of categories list exceeds its max allowed value
   * then we skip it and go to the child category of the current root category.
   */
  if ($(CATEGORY_LIST_ITEM_SELECTOR).length > maxCategoryDepth) {
    await requestQueue.addRequest({
      url: new URL(
        $(`.breadcrumbs li:nth-child(${maxCategoryDepth + 2}) a`)
          .attr("href")
          ?.trim(),
        loadedUrl
      ).href,
      userData: { label: LABELS.CATEGORY_OR_PRODUCTS }
    });

    log.info(
      `Too long or absent categories list, going to page ${
        new URL(
          $(".breadcrumbs li:nth-child(3) a").attr("href")?.trim(),
          loadedUrl
        ).href
      }`
    );
    return;
  }

  // we also skip current page if it has any filters selected except price
  if (
    $(".catalog-selection__list li").length &&
    !loadedUrl.includes("price=")
  ) {
    log.info(`Page has some filters turned on, skipping it: ${loadedUrl}`);
    return;
  }

  // if there's no products grid
  if (!$("ul.catalog-grid").length) {
    log.info(`Page has no products grid, skipping it: ${loadedUrl}`);
    return;
  }

  if (type === DAILY) {
    await scrapeProductsOrSplitPriceRange($, loadedUrl, requestQueue, userData);
  } else {
    await countProductsOrSplitPriceRange($, loadedUrl, requestQueue, userData);
  }
};

module.exports = {
  handleProductList
};
