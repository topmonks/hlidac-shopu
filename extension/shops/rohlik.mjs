import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Rohlik extends AsyncShop {
  get waitForSelector() {
    return "#productDetail";
  }

  async scrape() {
    const elem = document.querySelector("#productDetail");
    if (!elem) return;
    const itemId = document.querySelector(
      "#productDetail button[data-product-id]"
    ).dataset.productId;
    const title = document.title.split("-");
    const t = title[0].trim();
    const currentPrice = cleanPrice(
      `#productDetail .actionPrice,
       #productDetail .currentPrice`
    );
    const originalPrice = cleanPrice("#productDetail del");
    const imageUrl = document.querySelector("[data-gtm-item=product-image] img")
      .src;

    return { itemId, title: t, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector("#productDetail .AmountCounter");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new Rohlik(), "rohlik");
