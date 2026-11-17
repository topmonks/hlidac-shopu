/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */

/** @enum {string} */
export const Labels = {
  CATEGORY: "category",
  PRODUCT_DETAIL: "productDetail",
  INITIAL_CATEGORIES: "initialCategories"
};

/**
 * A plain URL in the `urls` input is a product page, in a Black Friday run too: the badge on the product page
 * decides there. A request object keeps its own label.
 *
 * @param {Array<RequestOptions|string>} urls
 * @returns {RequestOptions[]}
 */
export function urlRequests(urls) {
  return urls.map(url => (typeof url === "string" ? { url, label: Labels.PRODUCT_DETAIL } : url));
}

// The sitemap lists each product three times: the product page plus its leaflet and reviews tabs.
const PRODUCT_TAB = /\/(pribalovy-letak|recenze-zkusenosti)\/?$/;

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isProductUrl(url) {
  return !PRODUCT_TAB.test(new URL(url).pathname);
}

/**
 * The /black-friday listing can't be used instead: it also lists products without the badge
 * and its pagination repeats products, so some badged products never show up in it.
 *
 * @param {Document} document product detail page
 * @returns {boolean}
 */
export function hasBlackFridayBadge(document) {
  return Array.from(document.querySelectorAll(".product-badges .item")).some(badge =>
    /black\s*friday/i.test(badge.textContent)
  );
}
