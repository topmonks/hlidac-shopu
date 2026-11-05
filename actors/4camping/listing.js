/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * Product detail URLs listed on a category page. Product tiles link to the variant shown in the tile
 * (`/p/<product>/#<variant>`), the detail page holds the product and all its variants, so the variant
 * hash is dropped. No other links on the page point to `/p/`.
 * @param {Document} document
 * @param {string} pageUrl
 * @returns {string[]}
 */
export function listingProductUrls(document, pageUrl) {
  const { origin } = new URL(pageUrl);
  const urls = new Set();
  for (const a of document.querySelectorAll('a[href*="/p/"]')) {
    const url = new URL(a.getAttribute("href"), pageUrl);
    if (url.origin !== origin || !url.pathname.startsWith("/p/")) continue;
    urls.add(`${url.origin}${url.pathname}`);
  }
  return Array.from(urls);
}

/**
 * URLs of the remaining pages of a category, read from the first page. Pagination links are
 * `<category>?p=<page>` (the `#<page>` links are the same pages loaded by JS).
 * @param {Document} document
 * @param {string} pageUrl
 * @returns {string[]}
 */
export function listingPageUrls(document, pageUrl) {
  const page = new URL(pageUrl);
  if (page.searchParams.has("p")) return [];
  let lastPage = 1;
  for (const a of document.querySelectorAll('a[href*="p="]')) {
    const url = new URL(a.getAttribute("href"), pageUrl);
    if (url.pathname !== page.pathname) continue;
    const n = Number.parseInt(url.searchParams.get("p"), 10);
    if (n > lastPage) lastPage = n;
  }
  const urls = [];
  for (let n = 2; n <= lastPage; n++) {
    const url = new URL(page);
    url.searchParams.set("p", n);
    urls.push(url.href);
  }
  return urls;
}
