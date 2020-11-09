import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class Lekarna extends Shop {
  async scrape() {
    const elem = document.querySelector(".detail-top");
    if (!elem) return;

    const itemId = document
      .querySelector(".product__code span")
      .textContent.trim();
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = document
      .querySelector("[itemprop=price]")
      .getAttribute("content");
    const originalPrice = cleanPrice(".price__old");
    const imageUrl = document.querySelector(".product__img img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".product__price-and-form");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new Lekarna(), "lekarna");
