import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Kaufland extends AsyncShop {
  #selector = `.rd-buybox`;

  get injectionPoint() {
    return ["afterend", this.#selector];
  }

  get waitForSelector() {
    return this.#selector;
  }

  async scrape() {
    const elem = document.querySelector(this.#selector);
    if (!elem) return null;

    const itemId = location.pathname.split("/").pop();
    const title = document.querySelector(`h1.rd-title`).textContent.trim();
    const currentPrice = cleanPrice(`.rd-price-information__price`);
    if (!currentPrice) return null;

    const originalPrice = cleanPrice(`.rd-buybox-comparison__price`);
    const imageUrl = document
      .querySelector(`meta[property='og:image']`)
      .content.trim();
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Kaufland(), "kaufland_cz");
