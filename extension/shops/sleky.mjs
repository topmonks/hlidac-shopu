import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class SLeky extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".short-description"];
  }

  async scrape() {
    const title = document.querySelector("h1[itemprop='name']").innerText;
    const form = document.querySelector(".orderbox form");
    const itemId = form.dataset.productId;
    const currentPrice = cleanPrice(form.querySelector("strong.fullprice"));
    const originalPrice = cleanPrice(form.querySelector("dl>dt+dd"));
    const imageUrl = document.querySelector("img[itemprop=image],.content img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new SLeky(), "sleky");
