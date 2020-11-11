import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Benu extends Shop {
  get injectionPoint() {
    return ["afterend", ".buy-box"];
  }

  async scrape() {
    const richSnippet = JSON.parse(
      document.querySelector("#snippet-productRichSnippet-richSnippet")
        .innerText
    );

    const title =
      richSnippet.name ||
      document.querySelector(".product-title-rating .title").innerText;
    const itemId = richSnippet.identifier;
    const currentPrice = cleanPrice(".buy strong.buy-box__big-price");
    const originalPrice = cleanPrice(".buy .buy-box__price-head del");
    const imageUrl = document.querySelector("meta[property='og:image']")
      .content;

    return { title, itemId, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Benu(), "benu");
