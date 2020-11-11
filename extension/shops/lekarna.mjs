import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Lekarna extends Shop {
  get injectionPoint() {
    return ["afterend", ".product-detail-box"];
  }

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
}

registerShop(new Lekarna(), "lekarna");
