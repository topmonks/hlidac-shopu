import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class SLeky extends Shop {
  async scrape() {
    const title = document.querySelector("h1[itemprop='name']").innerText;
    const form = document.querySelector(".orderbox form");
    const itemId = form.dataset.productId;
    const currentPrice = cleanPrice(form.querySelector("strong.fullprice"));
    const originalPrice = cleanPrice(form.querySelector("dl>dt+dd"));
    const imageUrl = document.querySelector("img[itemprop=image]").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".orderbox");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new SLeky(), "sleky");
