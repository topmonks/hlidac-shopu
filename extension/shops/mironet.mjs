import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class Mironet extends Shop {
  async scrape() {
    const elem = document.querySelector(".product_detail");
    if (!elem) return;
    const itemId = document.querySelector(
      ".product_kosik_info input[name=Code]"
    ).value;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".product_cena_box .product_dph");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph span");
    const imageUrl = document.getElementById("DetailImg").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".product_kosik_info");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new Mironet(), "mironet");
