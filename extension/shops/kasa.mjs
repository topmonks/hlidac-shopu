import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Kasa extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const inputZbozi = document.querySelector('input[name="zbozi"]');
    const itemId = inputZbozi.getAttribute("value");
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#real_price");
    const originalPrice = cleanPrice(".before-price .text-strike");
    const imageUrl = document.querySelector(".large-img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".product-summary-tools");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("beforebegin", markup);
    return elem;
  }
}

registerShop(new Kasa(), "kasa");
