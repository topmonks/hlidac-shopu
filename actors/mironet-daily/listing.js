import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
export const Labels = {
  Categories: "categories",
  Page: "page",
  Pages: "pages"
};

export const BF_URL = "https://www.mironet.cz/vyprodej/?v=black-friday";

/**
 * @param {string} url
 * @returns {{url: string, userData: {label: Labels, baseUrl: string}}}
 */
export function firstPageRequest(url) {
  return { url, userData: { label: Labels.Page, baseUrl: url } };
}

/**
 * @param {{type:ActorType, urls:array, bfUrl?: string}}
 * @returns {{url: string, userData: {label: Labels, baseUrl?: string}}[]}
 */
export function startingRequests({ type, urls, bfUrl }) {
  switch (type) {
    case ActorType.BlackFriday:
      // The Black Friday page lists all its products itself, paginated by `PgID` like a category.
      // Its category tiles are no use: their subcategory links drop the Black Friday filter.
      return [firstPageRequest(bfUrl ?? urls[0] ?? BF_URL)];
    case ActorType.Test:
      return [firstPageRequest("https://www.mironet.cz/graficke-karty+c14402/")];
    case ActorType.Full:
      // `urls` limits the run to these categories, e.g. to compare two runs on the same categories
      if (urls.length) return urls.map(x => firstPageRequest(typeof x === "string" ? x : x.url));
      return [
        { url: "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz", userData: { label: Labels.Categories } }
      ];
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

/**
 * Categories that are not inside another category of the list, e.g. `/procesory+c14398/` but not
 * `/procesory/amd+c14413/`. A category lists the products of all its subcategories too, so these
 * cover the whole catalogue and each product is read about once instead of once per category level.
 * @param {string[]} urls category URLs from the sitemap
 * @returns {string[]}
 */
export function rootCategories(urls) {
  const path = url =>
    new URL(url).pathname
      .replace(/\+c\d+\/?$/, "")
      .split("/")
      .filter(Boolean);
  const paths = new Set(urls.map(url => path(url).join("/")));
  return urls.filter(url => {
    const parts = path(url);
    return !parts.slice(0, -1).some((_, i) => paths.has(parts.slice(0, i + 1).join("/")));
  });
}

/**
 * Number of pages of a listing, read from the pagination of its first page
 * @param {Document} document
 * @returns {number}
 */
export function pageCount(document) {
  return document.querySelectorAll(".pagination a.mirbtn").reduce((max, a) => {
    const pageNumber = parseInt(a.innerText.trim());
    return pageNumber > max ? pageNumber : max;
  }, 0);
}

/**
 * Number of products of a listing, `<div id="ItemCount"> 13836 produktů </div>`
 * @param {Document} document
 * @returns {number | null}
 */
export function itemCount(document) {
  const count = Number.parseInt(document.querySelector("#ItemCount")?.textContent.replace(/\s/g, "") ?? "", 10);
  return Number.isNaN(count) ? null : count;
}

/**
 * Number of pages of a listing. The pagination links stop at page 416 (~10 000 products), but the
 * pages after it exist, so the number of products decides. Without it the pagination links do.
 * @param {Document} document first page of the listing
 * @returns {number}
 */
export function lastPage(document) {
  const count = itemCount(document);
  const perPage = document.querySelectorAll(".item_b").length;
  if (count === null || !perPage) return pageCount(document);
  return count <= perPage ? 1 : Math.ceil(count / perPage);
}

/**
 * @param {string} baseUrl
 * @param {number} page
 * @returns {string}
 */
export function pageUrl(baseUrl, page) {
  const url = new URL(baseUrl);
  url.searchParams.append("PgID", page.toString());
  return url.href;
}

/**
 * Products of a listing page (category or the Black Friday page)
 * @param {{document: Document, rootUrl: string}}
 * @returns {Object[]}
 */
export function listingItems({ document, rootUrl }) {
  const breadCrumbs = Array.from(document.querySelectorAll("div#displaypath > a.CatParent"), cat =>
    cat.innerText.trim()
  );
  const toNumber = p => parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);
  return Array.from(document.querySelectorAll(".item_b"), item => {
    const idElem = item.querySelector(".item-code");
    const linkElem = item.querySelector(".nazev a");
    const priceElem = item.querySelector(".item_cena .item_b_cena");
    const imgElem = item.querySelector(".item_obr img");
    const oPriceElem = item.querySelector(".item_s_cena span.trought");
    const link = linkElem ? linkElem.getAttribute("href") : null;
    const price = priceElem ? priceElem.innerText.trim() : false;
    const dataItem = {
      img: imgElem ? `https:${imgElem.getAttribute("src")}` : null,
      itemId: idElem ? idElem.innerText.trim().replace("Kód: ", "") : null,
      itemUrl: `${rootUrl}${link}`,
      itemName: linkElem ? linkElem.innerText.trim() : null,
      discounted: !!oPriceElem,
      currentPrice: price ? toNumber(price) : null,
      breadCrumbs
    };
    if (oPriceElem) {
      dataItem.originalPrice = toNumber(oPriceElem.innerText.trim());
    }
    return dataItem;
  });
}
