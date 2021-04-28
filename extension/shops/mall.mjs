import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Mall extends StatefulShop {
  get injectionPoint() {
    return [
      "afterend",
      `.product-footer,
       .other-options-box,
       .detail-prices-wrapper,
       .info-box`
    ];
  }

  get detailSelector() {
    return ".info-box";
  }

  get observerTarget() {
    return document.querySelector("#main-content");
  }

  shouldRender(mutations) {
    return this.didMutate(mutations, "addedNodes", "info-box");
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "info-box");
  }

  async scrape() {
    const elem = document.querySelector(
      ".price-wrapper, .prices-wrapper, .price__wrap"
    );
    if (!elem) return;

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
    const originalPrice = cleanPrice(
      ".old-new-price .rrp-price, .old-price > del:nth-child(1), .price__wrap__box__old"
    );
    const imageUrl = document.querySelector(".gallery-magnifier__normal")?.src;
    if (!currentPrice) return;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mall(), "mall", "mall_sk");
