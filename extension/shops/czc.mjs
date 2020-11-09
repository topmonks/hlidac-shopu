import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class CZC extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemId = elem.dataset.productCode;
    const title = document.querySelector("h1").getAttribute("title");
    const currentPrice = cleanPrice(".price .price-vatin");
    const originalPrice = cleanPrice(".price-before .price-vatin");
    const imageUrl = document.querySelector("meta[itemprop=image]").content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".pd-price-delivery");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("beforeend", markup);
    return elem;
  }
}

registerShop(new CZC(), "czc");
