import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Prozdravi extends AsyncShop {
  get waitForSelector() {
    return ".product-prices-block__inner";
  }

  async scrape() {
    const title = document.querySelector("h1.product-header__header").innerText;
    const priceContainer = document.querySelector(
      ".product-prices-block__inner"
    );
    if (!priceContainer) return;

    const itemId = priceContainer.querySelector("input[name='product-code']")
      .value;
    const originalPrice = cleanPrice(
      priceContainer.querySelector("span.product-prices-block__backup-price")
    );
    const currentPrice = cleanPrice(
      priceContainer.querySelector(".product-prices-block__final-price")
    );
    const imageUrl = document.querySelector(".product-image-gallery__image")
      .src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(
      ".product-prices-block.product-prices-block--single-product"
    );
    console.log("inject", {elem});
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    console.log({markup});
    elem.insertAdjacentElement("beforeend", markup);
    return elem;
  }
}

registerShop(new Prozdravi(), "prozdravi");
