import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Siko extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".info-divider"];
  }

  async scrape() {
    const elem = document.querySelector(".product-main-info");
    if (!elem) return null;
    const title = elem.querySelector("h1[itemprop='name']").innerText;
    const itemUrl = document.location;
    const itemId = itemUrl.href.match(/\/p\/(\S+)/)?.[1];
    const currentPrice = cleanPrice(elem.querySelector(".product-detail-price > .price"));
    const originalPrice = cleanPrice(elem.querySelector(".product-detail-price > .oldPriceBlock > .oldPrice"));
    const imageUrl = `${itemUrl.origin}${document.querySelector("meta[itemprop='image']").getAttribute("content")}`;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Siko(), "siko_cz");
