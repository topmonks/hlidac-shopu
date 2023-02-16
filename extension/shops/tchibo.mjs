import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Tchibo extends Shop {
  async scrape() {
    const elem = document.querySelector(".pdp-buybox__add-to-cart-container");
    if (!elem) return;
    const itemUrl = document.location.href;
    const itemId = itemUrl.split("/").at(-2);
    const title = document
      .querySelector(".pdp-buybox__title")
      .textContent.trim();
    const currentPrice = cleanPrice(".tp-price-current");
    const originalPrice = cleanPrice(".tp-price-previous .tp-price-value");
    const imageUrl = document.querySelector(
      ".tp-imagegallery-main-container img"
    )?.src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".crosschannel-panel");
    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk");
