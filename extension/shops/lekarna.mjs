import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Lekarna extends Shop {
  get injectionPoint() {
    return [
      "afterend",
      `[itemprop=offers]`
    ];
  }

  async scrape() {
    const elem = document.querySelector("[itemtype='https://schema.org/Product']");
    if (!elem) return null;

    const itemId = elem
      .querySelector("[itemprop=sku]")
      ?.textContent.trim();
    const title = elem.querySelector("[itemprop=name]")?.textContent.trim();
    const currentPrice = elem
      .querySelector("[itemprop=price]")
      ?.getAttribute("content");
    const originalPrice = cleanPrice("[itemprop=offers] .line-through");
    const imageUrl = document.querySelector("[property='og:image']")?.content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Lekarna(), "lekarna");
