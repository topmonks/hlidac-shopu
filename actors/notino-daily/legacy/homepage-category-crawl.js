/**
 * RETIRED - kept for reference only, not imported anywhere. See GH #3587.
 *
 * This is the old FULL-mode discovery: parse the homepage mega-menu (`script#main-menu-state`) into
 * category URLs, then in the CATEGORY_PAGE handler follow the `rel="next"` pagination link.
 *
 * It was replaced by sitemap-driven discovery because Notino's paginated category URLs
 * (`...?f=<...>`) are blocked by Cloudflare Bot Management (403) for non-browser clients on every
 * proxy tier, so pagination never advanced past page 1 and coverage collapsed to ~8K of ~90K
 * products. The product sitemaps expose the full catalog over plain HTTP instead. Details of the
 * investigation are in the header comment of `../main.js`.
 *
 * If a future change makes category pagination viable again (e.g. a Cloudflare bypass or a JSON
 * listing API), this is the entry point that produced CATEGORY_PAGE requests from the homepage.
 */

import { log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * @param {Document} document
 * @param {string} rootUrl base origin, e.g. https://www.notino.cz
 * @returns {Array<{url: string, userData: {label: "CATEGORY_PAGE"}}>}
 */
export function homepageRequests(document, rootUrl) {
  log.debug("Home page");
  const jsonMainMenu = document.querySelector('script[id="main-menu-state"]').innerHTML;
  const mainMenu = JSON.parse(jsonMainMenu);
  const links = [];
  if (mainMenu) {
    const categories = mainMenu.fragmentContextData.DataProvider.categories;
    for (const category of categories) {
      if (category.columns.length > 0) {
        for (const column of category.columns) {
          for (const subCat of column.subCategories) {
            if (subCat.isLink && !subCat.link.includes("https")) {
              links.push({ url: `${rootUrl}${subCat.link}`, userData: { label: "CATEGORY_PAGE" } });
            }
            for (const pt of subCat.productTypes) {
              if (!pt.link.includes("https")) {
                links.push({ url: `${rootUrl}${pt.link}`, userData: { label: "CATEGORY_PAGE" } });
              }
            }
          }
        }
      } else if (!category.link.includes("https")) {
        links.push({ url: `${rootUrl}${category.link}`, userData: { label: "CATEGORY_PAGE" } });
      }
    }
  }
  log.info(`Found categories ${links.length}`);
  return links;
}
