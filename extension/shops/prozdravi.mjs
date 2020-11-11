import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Prozdravi extends AsyncShop {
  get injectionPoint() {
    return [
      "beforeend",
      ".product-prices-block.product-prices-block--single-product"
    ];
  }

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
}

registerShop(new Prozdravi(), "prozdravi");
