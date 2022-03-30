import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Lidl extends Shop {
  get injectionPoint() {
    if (this.isMobileDetailPage()) {
      return ["beforebegin", ".buybox__bottom"];
    } else {
      return ["afterend", ".keyfacts"];
    }
  }

  async scrape() {
    const elem = document.querySelector(".buybox");
    if (!elem) return;
    const itemId = document.querySelector(".buybox__erp-number").textContent;
    const title = document.querySelector(".keyfacts__title").textContent.trim();
    const currentPrice = cleanPrice(".m-price__price");
    const originalPrice = cleanPrice(".m-price__rrp");
    const imageUrl = document.querySelector(".gallery-image__img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  isMobileDetailPage() {
    const elem = document.querySelector("article.detail");
    const style = window.getComputedStyle(elem);
    return style.margin === "8px 0px 0px";
  }
}
registerShop(new Lidl(), "lidl_cz");
