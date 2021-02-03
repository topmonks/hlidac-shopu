import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mall extends Shop {
  get injectionPoint() {
    return [
      "afterend",
      `.product-footer,
       .other-options-box,
       .detail-prices-wrapper,
       .info-box`
    ];
  }

  async scrape() {
    const elem = document.querySelector(".price-wrapper, .prices-wrapper");
    if (!elem) return;

    const itemId = document
      .querySelector('span[data-sel="catalog-number"]')
      .innerText.trim()
      .replace("a", "");
    const title = document.querySelector("h1[itemprop=name]").innerText.trim();
    const currentPrice = cleanPrice("[itemprop=price]");
    const originalPrice = cleanPrice(
      ".old-new-price .rrp-price, .old-price > del:nth-child(1)"
    );
    const imageUrl = document.querySelector(".gallery-magnifier__normal").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mall(), "mall", "mall_sk");
