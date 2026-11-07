import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
export const Labels = {
  Categories: "categories",
  Page: "page",
  Pages: "pages"
};

export const BF_URL = "https://www.mironet.cz/vyprodej/?v=black-friday";

/**
 * @param {{type:ActorType, urls:array, bfUrl?: string}}
 * @returns {{url: string, userData: {label: Labels, baseUrl?: string}}}
 */
export function startingRequest({ type, urls, bfUrl }) {
  switch (type) {
    case ActorType.BlackFriday: {
      // The Black Friday page lists all its products itself, paginated by `PgID` like a category.
      // Its category tiles are no use: their subcategory links drop the Black Friday filter.
      const url = bfUrl ?? urls[0] ?? BF_URL;
      return {
        url,
        userData: {
          label: Labels.Page,
          baseUrl: url
        }
      };
    }
    case ActorType.Test:
      return {
        url: "https://www.mironet.cz/graficke-karty+c14402/",
        userData: {
          label: Labels.Page,
          baseUrl: "https://www.mironet.cz/graficke-karty+c14402/"
        }
      };
    case ActorType.Full:
      return {
        url: "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz",
        userData: {
          label: Labels.Categories
        }
      };
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

/**
 * URLs of the remaining pages of a listing, read from its first page
 * @param {{document: Document, baseUrl: string}}
 * @returns {string[]}
 */
export function pageUrls({ document, baseUrl }) {
  const pageNum = document.querySelectorAll(".pagination a.mirbtn").reduce((max, a) => {
    const pageNumber = parseInt(a.innerText.trim());
    return pageNumber > max ? pageNumber : max;
  }, 0);
  return restPageUrls(pageNum, pageNr => {
    const url = new URL(baseUrl);
    url.searchParams.append("PgID", pageNr.toString());
    return url.href;
  });
}

/**
 * Products of a listing page (category or the Black Friday page)
 * @param {{document: Document, rootUrl: string}}
 * @returns {Object[]}
 */
export function listingItems({ document, rootUrl }) {
  const breadCrumbs = Array.from(document.querySelectorAll("div#displaypath > a.CatParent")).map(cat =>
    cat.innerText.trim()
  );
  const toNumber = p => parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);
  return Array.from(document.querySelectorAll(".item_b")).map(item => {
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
