import { registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Penny extends AsyncShop {
  selector = `.p-final-price-wrapper`;

  get injectionPoint() {
    return ["afterend", `.add-to-cart`];
  }

  get waitForSelector() {
    return this.selector;
  }

  async scrape() {
    const itemId = document.querySelector("meta[itemprop='productID']").content;
    const title = document.querySelector("meta[itemprop='name']").content;
    const imageUrl = document.querySelector("meta[itemprop='image']").content;
    const currentPrice = document.querySelector("meta[property='product:price:amount']").content;
    //const originalPrice = document.querySelector(".price-standard").textContent;
    return { itemId, title, currentPrice, imageUrl };
  }
}

function toCZK(price) {
  if (!price) return null;
  return parseFloat((price / 100).toFixed(2));
}

registerShop(new Penny(), "pennydomu_cz");
