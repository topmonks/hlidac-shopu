const Apify = require("apify");

const {
  utils: { log }
} = Apify;

const urlBase = "https://www.electroworld.cz";

const productPageToken = ".product-list.product-list--tiles";
const productItemToken =
  ".product-list__item.product-box.product-box--tile.ajax-wrap";
const categoryToken = ".category-crossroad__item";

async function handleSubCategoryPage($, crawlContext) {
  const categories = $(categoryToken);
  const categoriesLinks = [];

  categories.each((i, e) => {
    const link = $(e).find("a");
    const categoryUrl = `${urlBase}${link.attr("href")}`;
    categoriesLinks.push(categoryUrl);
  });

  for (let i = 0; i < categoriesLinks.length; i++) {
    await crawlContext.requestQueue.addRequest({ url: categoriesLinks[i] });
  }
}

function addProductNumber($, crawlContext, request) {
  let count = $("#snippet--paramFilterProductsCount > strong")
    .text()
    .split(" ");
  count = Number(
    encodeURIComponent(count[count.length - 1]).split("%C2%A0")[0]
  );
  if (Number.isNaN(count)) {
    log.warning(`Unable to parse product count for url ${request.url}`);
    crawlContext.errors++;
  } else {
    log.info(`Found ${count} products for url ${request.url}`);
    crawlContext.productCount += count;
  }
}

exports.fetchPage = async ({ request, $ }, crawlContext) => {
  const productElements = $(productPageToken).find(productItemToken);
  const isSubCategoryPage = productElements.length === 0;

  if (isSubCategoryPage) {
    log.info(`Found new subcategory page: ${request.url}`);
    await handleSubCategoryPage($, crawlContext, request);
  } else {
    addProductNumber($, crawlContext, request);
  }
};
