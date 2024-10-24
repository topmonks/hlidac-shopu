import { cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Allegro extends AsyncShop {
  #selector = `[data-box-name=summaryOneColumn] [data-role=app-container]`;

  get injectionPoint() {
    return [
      "afterend",
      this.#selector,
      {
        margin: 0,
        padding: "16px",
        "padding-top": 0
      }
    ];
  }

  get waitForSelector() {
    return this.#selector;
  }

  async scrape() {
    const elem = document.querySelector(this.#selector);
    if (!elem) return null;

    const itemId = elem.querySelector(`meta[itemprop=sku]`).content.trim();
    const title = elem.querySelector(`meta[itemprop=name]`).content.trim();
    const currentPrice = cleanPriceText(elem.querySelector(`[itemprop=price]`).content.trim());
    if (!currentPrice) return null;

    let originalPriceEl = elem.querySelector(`[style="text-decoration:line-through"]`);
    const originalPrice = originalPriceEl ? cleanPriceText(originalPriceEl?.textContent?.trim()) : null;
    const imageUrl = elem.querySelector(`meta[itemprop=image]`).content.trim();
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

//registerShop(new Allegro(), "allegro_cz");
