import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Pilulka extends Shop {
  get injectionPoint() {
    return ["beforeend", ".product-detail__reduced h1+div+div"];
  }

  async scrape() {
    const title = document.querySelector(".product-detail__header").innerText;
    const priceContainer = document.querySelector("div.js-product-prev");
    const itemId = priceContainer.attributes["data-product-id"].textContent;
    const currentPrice = cleanPrice(`.js-product-price-${itemId}`);
    const originalPrice = cleanPrice(
      document.querySelector(`.js-product-price-${itemId}`).nextElementSibling
    );
    const imageUrl = document.querySelector(".product-detail__images--img")
      .dataset["src"];

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
