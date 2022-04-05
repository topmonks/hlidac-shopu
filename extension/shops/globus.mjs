import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Globus extends Shop {
  get injectionPoint() {
    return ["afterend", ".product-configurator"];
  }

  async scrape() {
    const elem = document.querySelector(".product-configurator");
    if (!elem) return;
    const itemId = elem
      .querySelector("form")
      .getAttribute("action")
      .split("/")
      .slice(-1)[0];
    const title = elem.querySelector(".title--product").textContent.trim();
    const originalPrice = cleanPrice(".money-price__amount:first-child");
    const currentPrice = cleanPrice(".money-price__amount:last-child");
    const imageUrl = document.querySelector("lazy-image img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Globus(), "iglobus");
