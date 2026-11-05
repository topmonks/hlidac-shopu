/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * Friday Noir categories: tiles of the Black Friday landing page ("Slevy a cashbacky ve Friday Noir") headed
 * "Friday Noir: <name>", e.g. `/friday-noir-canon` or `/dzofilm-black-friday-2026-promotion`. The other tiles
 * there are regular promotions and cashbacks.
 * @param {Document} document
 * @param {string} pageUrl
 * @returns {string[]}
 */
export function fridayNoirCategoryUrls(document, pageUrl) {
  const { origin } = new URL(pageUrl);
  const urls = new Set();
  for (const a of document.querySelectorAll("a.product-box__link[href]")) {
    const heading = a.querySelector(".product-box__heading")?.textContent.trim();
    if (!/^Friday Noir\b/i.test(heading ?? "")) continue;
    const url = new URL(a.getAttribute("href"), pageUrl);
    if (url.origin !== origin) continue;
    urls.add(`${url.origin}${url.pathname}`);
  }
  return Array.from(urls);
}

/**
 * Products of a category page. Product id is the one megapixel uses in its analytics
 * (`onProductItem<id>Click`, `#picture-<id>`), the same as `data-product-item-id` on the detail page.
 * @param {Document} document
 * @param {string} pageUrl
 * @returns {{itemId: string, itemUrl: string}[]}
 */
export function listingProducts(document, pageUrl) {
  const products = [];
  for (const box of document.querySelectorAll("#snippet-productsFilter-products .js-product-box")) {
    const link = box.querySelector("a.product-box__link[href]");
    if (!link) continue;
    const itemId =
      link.getAttribute("onclick")?.match(/onProductItem(\d+)Click/)?.[1] ??
      box.querySelector('[id^="picture-"]')?.id.replace("picture-", "");
    if (!itemId) continue;
    products.push({ itemId, itemUrl: new URL(link.getAttribute("href"), pageUrl).href });
  }
  return products;
}

/**
 * URLs of the remaining pages of a category, read from its first page (`?page=<n>` links of the pager).
 * @param {Document} document
 * @param {string} pageUrl
 * @returns {string[]}
 */
export function listingPageUrls(document, pageUrl) {
  const page = new URL(pageUrl);
  if (page.searchParams.has("page")) return [];
  let lastPage = 1;
  for (const a of document.querySelectorAll('a[href*="page="]')) {
    const url = new URL(a.getAttribute("href"), pageUrl);
    if (url.pathname !== page.pathname) continue;
    const n = Number.parseInt(url.searchParams.get("page"), 10);
    if (n > lastPage) lastPage = n;
  }
  const urls = [];
  for (let n = 2; n <= lastPage; n++) {
    const url = new URL(page);
    url.searchParams.set("page", n);
    urls.push(url.href);
  }
  return urls;
}
