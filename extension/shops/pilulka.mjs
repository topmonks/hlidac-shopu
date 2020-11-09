import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class Pilulka extends Shop {
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

  inject(renderMarkup) {
    const elem = document.querySelector(".product-detail__reduced h1+div+div");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("beforeend", markup);
    return elem;
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
