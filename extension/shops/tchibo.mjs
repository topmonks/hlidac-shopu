import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Tchibo extends AsyncShop {
  selector = ".crosschannel";

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
    const currentPrice = cleanPrice("#pdp-buybox .tp-price-current .tp-price-number");
    const originalPrice = cleanPrice("#pdp-buybox .pdp-price-display__lowest-price-note .tp-price-number");
    const imageUrl = document.querySelector(".tp-imagegallery-main-container img")?.src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk");
