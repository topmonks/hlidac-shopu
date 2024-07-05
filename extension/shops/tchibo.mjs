import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Tchibo extends AsyncShop {
  selector = ".crosschannel-panel";

  get injectionPoint() {
    return ["afterend", this.selector];
  }

  get waitForSelector() {
    return this.selector;
  }

  async scrape() {
    const elem = document.querySelector(".pdp-buybox__add-to-cart-container");
    if (!elem) return;
    const itemUrl = document.location.href;
    const itemId = itemUrl.split("/").at(-2);
    const title = document.querySelector(".pdp-buybox__title").textContent.trim();
    const currentPrice = cleanPrice(".tp-price-current");
    const originalPrice = cleanPrice(".tp-price-previous .tp-price-value");
    const imageUrl = document.querySelector(".tp-imagegallery-main-container img")?.src;

    console.log({ itemId, title, currentPrice, originalPrice, imageUrl });
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk");
