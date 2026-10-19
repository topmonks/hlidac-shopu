import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

const parseProductLd = () => {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      if (data?.["@type"] === "Product") return data;
    } catch {}
  }
  return null;
};

// The analytics dataLayer the shop renders into every page.
const parseDataLayer = () => {
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
};

// Keep the price rule identical to actors/mountfield-daily/extract.js.

// Price an anonymous shopper sees. The sale block renders it as <span itemprop="price">, or as a text
// node next to the struck-through or recommended price, so those are dropped and the rest is read.
// The club price sits in a separate block and is never read. JSON-LD and itemprop=price can carry
// the loyalty price, so they are not used.
const salePriceText = sale => {
  const wrapper = sale?.querySelector(":scope > div");
  if (!wrapper) return null;
  const clone = wrapper.cloneNode(true);
  for (const reference of clone.querySelectorAll(".box-detail-add__dmc-price, .box-detail-add__prices__item__text")) {
    reference.remove();
  }
  return clone.textContent;
};

export class Mountfield extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".box-detail-info__links"];
  }

  async scrape() {
    const elem = document.querySelector(".box-detail");
    if (!elem) return;
    const productLd = parseProductLd();
    const itemId = (elem.querySelector("meta[itemprop=sku]")?.content ?? productLd?.sku)?.trim()?.toLowerCase();
    const title = elem.querySelector("h1.box-detail__heading")?.textContent?.trim() ?? productLd?.name;

    const sale = elem.querySelector(".box-detail-add__prices__item--sale");
    // pages of products not sold online have no sale block, the dataLayer still carries the price
    const dataLayerPrice = parseDataLayer()?.ecommerce?.detail?.products?.[0]?.priceWithTax;
    const currentPrice =
      cleanPriceText(salePriceText(sale)) ?? (dataLayerPrice != null ? cleanPriceText(String(dataLayerPrice)) : null);
    let originalPrice =
      cleanPrice(sale?.querySelector(".box-detail-add__prices__item__text__price")) ??
      cleanPrice(sale?.querySelector(".box-detail-add__dmc-price span"));
    if (!(Number(originalPrice) > Number(currentPrice))) originalPrice = null;

    const ldImage = Array.isArray(productLd?.image) ? productLd.image[0] : productLd?.image;
    const imageUrl = elem.querySelector("img[itemprop=image]")?.src ?? ldImage;
    if (!itemId || !title || !currentPrice) return;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mountfield(), "mountfield", "mountfield_sk");
