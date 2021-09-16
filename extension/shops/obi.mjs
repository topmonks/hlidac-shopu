import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Obi extends Shop {
  get injectionPoint() {
    return ["afterend", "#AB_buttons"];
  }

  async scrape() {
    const elem = document.querySelector(".overview__description");
    if (!elem) return;

    const title = document
      .querySelector("h1.overview__heading")
      .textContent.trim();
    const currentPrice = cleanPrice(".overview__price");
    const originalPrice = cleanPrice(".optional-hidden del");
    const imageUrl = document.querySelector(".ads-slider__link img").src;
    let itemId = window.location.pathname.match(/p\/(\d+)(#\/)?$/)?.[1];

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(
  new Obi(),
  "obi_cz",
  "obi_sk",
  "obi_pl",
  "obi_hu",
  "obi-italia_it",
  " obi_de",
  "obi_at",
  "obi_ru",
  "obi_ch"
);
