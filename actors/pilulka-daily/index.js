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
