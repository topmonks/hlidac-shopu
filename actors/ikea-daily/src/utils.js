/**
 * Gets urls of categories and subcategories on site.
 * @param $
 * @returns {[{url,{label}}]}
 */
exports.getCategoryRequests = $ => {
  const categories = [];
  $("loc").each((index, locElement) => {
    categories.push({
      url: $(locElement).html(),
      userData: {
        label: "CATEGORY"
      }
    });
  });
  return categories;
};
exports.siteMapToLinks = data => {
  const locs = data.replace(/\s+/g, "").match(/(<loc>)(.*?)(<\/loc>)/g);
  if (locs) {
    return locs.map(link => link.replace(/<loc>|<\/loc>/g, ""));
  }
  return [];
};
/**
 * Gets urls of subcategories on category labeled page, if any.
 * @param $
 * @returns {[subcategories' urls]}
 */
exports.getSubcategoriesUrls = $ => {
  const subcategories = [];
  $("nav[role='navigation'] a[class*='vn-link']").each((index, link) => {
    const subcategory = $(link).attr("href");
    if (subcategory != null) {
      subcategories.push(subcategory);
    }
  });
  return subcategories;
};
/**
 * Models and fills productData object.
 * @param product product object returned by previous request
 * @param numberOfVariants number of available product variants
 * @returns {productData}
 */
exports.fillProductData = (product, numberOfVariants) => {
  return {
    itemName: `${product.name}: ${product.typeName}`,
    itemUrl: product.pipUrl,
    currentPrice: parseFloat(product.priceNumeral),
    originalPrice: null,
    discounted: false,
    productTypeName: product.typeName,
    // number of products in stock is different
    // for individual shopping places
    inStock: true,
    // if the product is a variant, use variantId else use productId
    itemId: numberOfVariants !== 0 ? product.id : product.itemNoGlobal,
    // description: '',
    img: product.mainImageUrl,
    sale: 0
  };
};
/**
 * Gets product's price from detail page.
 * @param $
 * @returns {number|boolean}
 */
exports.getPrice = $ => {
  const integer = $("div[class='range-revamp-pip-price-package__main-price']")
    .find("span[class='range-revamp-price__integer']")
    .eq(0)
    .text()
    .replace(/\s/, "");
  const decimals = $("div[class='range-revamp-pip-price-package__main-price']")
    .find("span[class='range-revamp-price__decimals']")
    .eq(0)
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text()
    .replace(/\s/, "");
  if (integer && decimals) {
    return parseFloat(`${integer}.${decimals}`);
  }
  if (integer) {
    return parseFloat(integer);
  }
  return false;
};
/**
 * Gets product's variant name from detail page.
 * @param $
 * @returns {string|null}
 */
exports.getVariantName = ($, productTypeName) => {
  let name = "";
  const spans = $("h1[class='range-revamp-header-section']")
    .find("div[class='range-revamp-header-section__description']")
    .eq(0)
    .find("span");
  spans.each((index, span) => {
    name += `${$(span).text()}`;
    if (index !== spans.length - 1) {
      name += ", ";
    }
  });

  return name.substr(productTypeName.length + 2);
};
/**
 * Tries to get product's price before sale.
 * @param $
 * @returns {number|boolean}
 */
exports.tryGetRetailPrice = $ => {
  // retail price if the item is in sale (strike through)
  let integer = $(
    "div[class='range-revamp-pip-price-package__previous-price-hasStrikeThrough']"
  )
    .find("span[class='range-revamp-price__integer']")
    .eq(0)
    .text()
    .replace(/\s/, "");
  let decimals = $(
    "div[class='range-revamp-pip-price-package__previous-price-hasStrikeThrough']"
  )
    .find("span[class='range-revamp-price__decimals']")
    .eq(0)
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text()
    .replace(/\s/, "");
  if (integer && decimals) {
    return parseFloat(`${integer}.${decimals}`);
  }
  if (integer) {
    return parseInt(integer, 10);
  }
  // retail price if the item is in sale (without strike through) e.g. ikea family sale
  integer = $("div[class='range-revamp-pip-price-package__previous-price']")
    .find("span[class='range-revamp-price__integer']")
    .eq(0)
    .text();
  decimals = $("div[class='range-revamp-pip-price-package__previous-price']")
    .find("span[class='range-revamp-price__decimals']")
    .eq(0)
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text();
  if (integer && decimals) {
    return parseFloat(`${integer}.${decimals}`);
  }
  if (integer) {
    return parseInt(integer, 10);
  }
  return false;
};
/**
 * Gets number of reviews and review score from product's detail page.
 * @param $
 * @returns {{reviewScore: string, numberOfReviews: number}}
 */
exports.getReview = $ => {
  const review = {
    numberOfReviews: 0,
    reviewScore: ""
  };
  const reviewButton = $(
    "button[class='range-revamp-average-rating range-revamp-average-rating__button']"
  );
  if ($(reviewButton).eq(0).html() === null) {
    // if there is no review of the product yet
    return review;
  }
  // review score
  review.reviewScore = $(reviewButton)
    .eq(0)
    .attr("aria-label")
    .match(/[0-9]\.?[0-9]?/)[0];
  // number of reviews
  review.numberOfReviews = $(reviewButton)
    .find("span[class='range-revamp-average-rating__reviews']")
    .eq(0)
    .text()
    .match(/[0-9]+/)[0];
  return review;
};
/**
 * Returns the category path to a product as an array of strings.
 * Starts from the most general category.
 * @param $
 * @returns {[array of categories]}
 */
exports.getProductDetailCategories = $ => {
  const categories = [];
  $("li[class='bc-breadcrumb__list-item']")
    .find("span")
    .each((index, category) => {
      categories.push($(category).text());
    });
  // the last category is the name of the product
  categories.pop();
  return categories;
};
