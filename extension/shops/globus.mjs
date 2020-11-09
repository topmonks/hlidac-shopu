import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.js";

export class Globus extends AsyncShop {

  get waitForSelector() {
    return ".detail-title h1";
  }

  async scrape() {
    const elem = document.querySelector("#detail-container");
    if (!elem) return;
    const itemId = elem.getAttribute("data-stock-item-code");
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".detail-price-now");
    const originalPrice = cleanPrice(".product-discount strong");
    const imageUrl = document.querySelector(".detail-image img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector("#detail-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("beforeend", markup);
    return elem;
  }
}

registerShop(new Globus(), "iglobus");
