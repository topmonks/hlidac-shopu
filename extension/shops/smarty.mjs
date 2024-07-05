import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Smarty extends AsyncShop {
  #selector = `[itemtype="http://schema.org/Product"] .orderBoxes`;

  get injectionPoint() {
    return ["afterend", this.#selector];
  }

  get waitForSelector() {
    return this.#selector;
  }

  async scrape() {
    const elem = document.querySelector(this.#selector);
    if (!elem) return null;

    // e.g.:
    // https://www.smarty.cz/PlayStation-5-verze-slim--p160486
    // <meta itemprop="sku" content="160486">
    let locationItemIdMatch = location.pathname.match(/-p(\d+)$/);
    const itemId =
      locationItemIdMatch && locationItemIdMatch[1]
        ? locationItemIdMatch[1]
        : document.querySelector(`meta[itemprop="sku"]`).content;
    const title = document.querySelector(`h1`).textContent.trim();
    const currentPrice = document
      .querySelector(`[itemtype="http://schema.org/Product"] [itemprop="price"]`)
      .getAttribute(`content`);
    if (!currentPrice) return null; //

    // eg.:
    // <p class="priceOld">Sleva 12 % <span>z 13 590 Kč</span></p>
    const originalPrice = cleanPrice(`.priceOld span`);
    const imageUrl = document
      .querySelector(`meta[property='og:image:secure_url'] meta[property='og:image']`) // prefer https, fallback to http
      .content.trim();
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Smarty(), "smarty_cz");
