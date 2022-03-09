export function getAllSubcategories($) {
  // left panel contains links to all categories with subcategories
  // we're enqueueing all subcategories to have smaller pagination
  const subcategories = [];
  const menu = $("div[id='categories_block_left']")
    .find("ul[class*='tree']")
    .eq(0);
  $(menu)
    .find("> li:not([class*='action'])")
    .each((index, category) => {
      const categoryName = $(category).find("a").eq(0).attr("title");
      if ($(category).has("ul").length !== 0) {
        $(category)
          .find("li")
          .each((index2, subcategory) => {
            subcategories.push({
              name: [
                categoryName,
                $(subcategory).find("a").eq(0).attr("title")
              ],
              url: $(subcategory).find("a").eq(0).attr("href")
            });
          });
      } else {
        subcategories.push({
          name: [categoryName],
          url: $(category).find("a").eq(0).attr("href")
        });
      }
    });
  return subcategories;
}

export function getMaxPaginationNumber($) {
  return $("li[id='pagination_next']").prev().eq(0).text();
}

const modelProductData = ($, product, categories) => {
  const title = $(product).find("h2 a");
  const bottomBox = $(product).find("div[class='product-bottom-box']");
  const itemUrl = $(title).attr("href");
  const slugMatch = itemUrl.match(/\/([0-9\-\w]*)\.html/);
  let slug = "";
  let all = "";
  if (slugMatch) {
    [all, slug] = slugMatch;
  }
  return {
    itemId: $(title)
      .attr("href")
      .match(/\/([0-9]){4}[0-9]*-/)[0]
      .match(/[0-9]+/)[0],
    img: $(product).find("img").eq(0).attr("src"),
    itemUrl,
    itemName: $(title).text(),
    slug,
    currentPrice: parseInt(
      $(bottomBox)
        .find("span[class='price']")
        .eq(0)
        .text()
        .match(/[0-9]+/)[0],
      10
    ),
    originalPrice: $(bottomBox).find("span[class='old-price']").eq(0).text(),
    rating: $(bottomBox).find("span[class='rating']").eq(0).text().trim(),
    discounted: false,
    sale: $(product).find("div[class*='product-sale']").eq(0).text(),
    category: categories.join(" > "),
    currency:
      $(bottomBox).find("span[class='price_currency']").eq(0).text() === "Kč"
        ? "CZK"
        : $(bottomBox).find("span[class='price_currency']").eq(0).text(),
    inStock: $(product).find("span[class='product-available']").length > 0
  };
};

export function getProductsData($, categories, alreadyScrapedProducts) {
  const productsData = [];
  let outOfStockProductDiscovered = false;
  const products = $("ul[id='product_list']").find("li");
  products.each((index, product) => {
    const productData = modelProductData($, product, categories);
    if (productData.originalPrice) {
      productData.originalPrice = parseInt(
        productData.originalPrice.match(/[0-9]+/)[0],
        10
      );
    } else {
      // If current price is equal to original price, then original should be null
      // If the original price is extracted then prices differ, if not they are equal
      productData.originalPrice = null;
    }
    if (!productData.sale) {
      productData.sale = 0;
    } else {
      productData.sale = parseInt(productData.sale.match(/[0-9]+/)[0], 10);
    }
    if (productData.rating) {
      productData.rating = parseFloat(
        productData.rating.match(/[0-9]+\.?[0-9]*/)[0]
      );
    }
    productData.discounted = !!productData.originalPrice;
    // Push product data only if it wasn't already scraped - deduplication of products
    // (on the page there are same products in multiple categories)
    if (!alreadyScrapedProducts.has(productData.itemId)) {
      if (productData.inStock) {
        alreadyScrapedProducts.add(productData.itemId);
        productsData.push(productData);
      } else {
        outOfStockProductDiscovered = true;
      }
    }
  });
  return {
    productsData,
    outOfStockProductDiscovered
  };
}
