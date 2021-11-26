import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Lidl extends Shop {
  get injectionPoint() {
    return ["afterend", ".keyfacts"];
  }

  async scrape() {
    const elem = document.querySelector(".buybox");
    if (!elem) return;
    const itemId = document.querySelector(".buybox__erp-number").textContent;
    const title = document.querySelector(".keyfacts__title").textContent;
    const currentPrice = cleanPrice(".m-price__price");
    const originalPrice = cleanPrice(".m-price__rrp");
    const imageUrl = document.querySelector(".gallery-image__img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}
registerShop(new Lidl(), "lidl_cz");
