import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Mall extends AsyncShop {
  get injectionPoint() {
    return [
      "afterend",
      `.product-footer,
       .other-options-box,
       .detail-prices-wrapper,
       .info-box`
    ];
  }

  get waitForSelector() {
    return ".info-box";
  }

  async scrape() {
    const elem = document.querySelector(
      ".price-wrapper, .prices-wrapper, .price__wrap"
    );
    if (!elem) return null;

    const itemId = document
      .querySelector(
        'span[data-sel="catalog-number"], .additional-info__catalog-number span'
      )
      .innerText.trim()
      .replace("a", "");
    const title = document.querySelector("h1[itemprop=name]").innerText.trim();
    const currentPrice = cleanPrice(
      "[itemprop=price], .price__wrap__box__final"
    );
    if (!currentPrice) return null;

    const originalPrice = cleanPrice(
      ".old-new-price .rrp-price, .old-price > del:nth-child(1), .price__wrap__box__old"
    );
    const imageUrl = document.querySelector(".gallery-magnifier__normal")?.src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mall(), "mall", "mall_sk");
