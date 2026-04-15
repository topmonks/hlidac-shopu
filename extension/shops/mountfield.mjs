import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mountfield extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".box-detail-info__links"];
  }

  async scrape() {
    const elem = document.querySelector(".box-detail");
    if (!elem) return;
    const itemId = elem.querySelector("meta[itemprop=sku]").content.trim().toLowerCase();
    const title = elem.querySelector("h1.box-detail__heading").textContent.trim();
    const originalPrice =
      cleanPrice(".box-detail-add__prices__item__text__price") ?? cleanPrice(".box-detail-add__dmc-price");

    // Extract current price from displayed text, not meta[itemprop=price],
    // because the meta tag contains the club/loyalty price when it exists
    let currentPrice = null;
    const saleWrapper = elem.querySelector(".box-detail-add__prices__item--sale > div");
    if (saleWrapper) {
      for (const node of saleWrapper.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text) {
            currentPrice = cleanPriceText(text);
            break;
          }
        }
      }
    }
    currentPrice ??= cleanPriceText(elem.querySelector("meta[itemprop=price]")?.content?.trim());

    const imageUrl = elem.querySelector("img[itemprop=image]").src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mountfield(), "mountfield", "mountfield_sk");
