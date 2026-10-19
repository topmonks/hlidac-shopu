/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("linkedom/types/interface/element").Element} Element */

/** @enum {string} */
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

/**
 * Same parsing as cleanPriceText in lib/parse.mjs, which the extension uses.
 * @param {string|null|undefined} text
 * @return {number|null}
 */
export function parsePrice(text) {
  const match = text?.replace(/\s+/g, "").match(/\d+(?:[,.]\d+)?/);
  return match ? Number.parseFloat(match[0].replace(",", ".")) : null;
}

/**
 * Collapses whitespace, including the non-breaking spaces in product names.
 * @param {string|null|undefined} text
 * @return {string|undefined}
 */
const cleanText = text => text?.replace(/\s+/g, " ").trim();

/**
 * Locations of the sitemaps listed in a sitemap index.
 * @param {Document} document parsed as XML
 * @return {string[]}
 */
export function sitemapUrls(document) {
  return Array.from(document.querySelectorAll("sitemap > loc"), loc => loc.textContent.trim());
}

// magazine, advice, videos, company and shopping info, tags; products never live there
const nonProductSections =
  /^\/(magazin|poradna|videa|o-spolecnosti|o-nas|kariera|sortiment|vse-o-nakupu|vsetko-o-nakupe|stitek|stitok)\//;

/**
 * Page locations from a sitemap. Products are not marked as such, so every page is returned
 * except the ones the image sitemap marks as categories by their category image, and article sections.
 * @param {Document} document parsed as XML
 * @return {string[]}
 */
export function pageUrls(document) {
  return Array.from(document.querySelectorAll("url"))
    .filter(url => !url.textContent.includes("/content/images/category/"))
    .map(url => url.querySelector("loc")?.textContent.trim())
    .filter(url => url && !nonProductSections.test(new URL(url).pathname));
}

/**
 * The analytics `dataLayer` the shop renders into every page.
 * @param {Document} document
 * @return {object|null}
 */
function dataLayer(document) {
  for (const script of document.querySelectorAll("script:not([src])")) {
    const json = script.textContent.match(/dataLayer = (\[.*\]);/)?.[1];
    if (!json) continue;
    try {
      return JSON.parse(json)[0];
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Document} document
 * @return {string}
 */
const breadcrumb = document =>
  Array.from(document.querySelectorAll(".box-breadcrumb__item"), item => item.textContent.trim()).join(" > ");

// Keep the price rule identical to extension/shops/mountfield.mjs.

/**
 * Price an anonymous shopper sees. The sale block renders it as `<span itemprop="price">`, or as a text
 * node next to the struck-through or recommended price, so those are dropped and the rest is read.
 * The club price sits in a separate block and is never read.
 * @param {Element|null} sale `.box-detail-add__prices__item--sale`
 * @return {string|null}
 */
function salePriceText(sale) {
  const wrapper = sale?.querySelector(":scope > div");
  if (!wrapper) return null;
  const clone = wrapper.cloneNode(true);
  for (const reference of clone.querySelectorAll(".box-detail-add__dmc-price, .box-detail-add__prices__item__text")) {
    reference.remove();
  }
  return clone.textContent;
}

/**
 * @param {Document} document
 * @param {Country} country
 * @param {string} url the URL the page was loaded from
 * @return {object|null} the product, or null when the page is not a product detail
 */
export function extractDetail(document, country, url) {
  const elem = document.querySelector(".box-detail");
  if (!elem) return null;

  const sale = elem.querySelector(".box-detail-add__prices__item--sale");
  // pages of products not sold online have no sale block, the dataLayer still carries the price
  const currentPrice =
    parsePrice(salePriceText(sale)) ?? dataLayer(document)?.ecommerce?.detail?.products?.[0]?.priceWithTax ?? null;
  let originalPrice =
    parsePrice(sale?.querySelector(".box-detail-add__prices__item__text__price")?.textContent) ??
    parsePrice(sale?.querySelector(".box-detail-add__dmc-price span")?.textContent);
  if (!(originalPrice > currentPrice)) originalPrice = null;

  const itemId = elem.querySelector("meta[itemprop=sku]")?.getAttribute("content")?.trim().toLowerCase();
  const itemName = cleanText(elem.querySelector("h1.box-detail__heading")?.textContent);
  if (!itemId || !itemName || currentPrice === null) {
    throw new Error(`Product detail without SKU, name or price at ${url} - DOM structure changed`);
  }

  const product = productLd(document);
  const image = Array.isArray(product?.image) ? product.image[0] : product?.image;
  // the listing thumbnail, the same image listing items get
  return {
    id: itemId,
    itemId,
    itemUrl: document.querySelector("link[rel=canonical]")?.getAttribute("href") ?? url,
    itemName,
    currentPrice,
    originalPrice,
    discounted: originalPrice !== null,
    // kept for the table schema; currentPrice is never the club price
    loyalty: false,
    category: breadcrumb(document),
    currency: country === Country.CZ ? "CZK" : "EUR",
    img: image?.replace("/content/images/product/original/", "/content/images/product/list/") ?? null
  };
}

/**
 * @param {Document} document
 * @return {object|null}
 */
function productLd(document) {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      if (data?.["@type"] === "Product") return data;
    } catch {}
  }
  return null;
}

/**
 * Other sizes and colours of the product. Category listings show only one of them.
 * @param {Document} document
 * @return {string[]}
 */
export function variantUrls(document) {
  return Array.from(document.querySelectorAll("a.box-detail-info__variants__items__item"), a =>
    a.getAttribute("href")
  ).filter(Boolean);
}

/**
 * Price text of a listing price element without its label.
 * @param {Element|null} elem
 * @return {number|null}
 */
function listingPrice(elem) {
  if (!elem) return null;
  const clone = elem.cloneNode(true);
  clone.querySelector("span")?.remove();
  return parsePrice(clone.textContent);
}

/**
 * Products of a category listing. A card of a product with sizes or colours shows one of them without
 * its struck-through price, those cards are left to the product detail.
 * Same price rule as extractDetail: the main price is what an anonymous shopper pays, the club price
 * in `.list-products__item__loyalty__link` is never read.
 * @param {Document} document
 * @param {Country} country
 * @return {object[]}
 */
export function listingItems(document, country) {
  const category = breadcrumb(document);
  return Array.from(document.querySelectorAll(".list-products__item__in"))
    .filter(card => !card.querySelector(".list-products__item__info--is-variant"))
    .map(card => {
      const link = card.querySelector("a.list-products__item__block");
      const gtm = JSON.parse(link.getAttribute("data-gtm") ?? "null")?.ecommerce?.click?.products?.[0];
      const itemId = gtm?.id?.trim().toLowerCase();
      const itemName = cleanText(card.querySelector("h2")?.textContent);
      const currentPrice =
        listingPrice(card.querySelector(".list-products__item__info__price__item--main")) ?? gtm?.priceWithTax ?? null;
      let originalPrice =
        listingPrice(card.querySelector(".list-products__item__info__price__item--old")) ??
        parsePrice(card.querySelector(".box__future-price__list strong")?.textContent);
      if (!(originalPrice > currentPrice)) originalPrice = null;
      const itemUrl = link.getAttribute("href");
      if (!itemId || !itemName || currentPrice === null) {
        throw new Error(`Listing card without SKU, name or price for ${itemUrl} - DOM structure changed`);
      }
      const img = card.querySelector("img");
      return {
        id: itemId,
        itemId,
        itemUrl,
        itemName,
        currentPrice,
        originalPrice,
        discounted: originalPrice !== null,
        loyalty: false,
        category,
        currency: country === Country.CZ ? "CZK" : "EUR",
        img: img?.getAttribute("data-src") || img?.getAttribute("src") || null
      };
    });
}

/**
 * Links from a category listing page.
 * @param {Document} document
 * @param {string} url the URL the page was loaded from
 * @return {{categories: string[], products: string[], variants: string[], nextPage: string|null}}
 */
export function categoryLinks(document, url) {
  const href = a => new URL(a.getAttribute("href"), url).href;
  const categories = new Set(
    Array.from(document.querySelectorAll(".list-categories__item__block, .list-categories-with-article__box"), href)
  );
  const cards = Array.from(document.querySelectorAll(".list-products__item__in"));
  const isVariant = card => Boolean(card.querySelector(".list-products__item__info--is-variant"));
  const cardUrls = cards => new Set(cards.map(card => href(card.querySelector("a.list-products__item__block"))));
  const products = cardUrls(cards.filter(card => !isVariant(card)));
  const variants = cardUrls(cards.filter(isVariant));
  const next = document.querySelector("a.in-paging__control__item--arrow-next");
  return {
    categories: [...categories],
    products: [...products],
    variants: [...variants],
    nextPage: next ? href(next) : null
  };
}
