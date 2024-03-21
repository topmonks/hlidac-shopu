import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Penny extends Shop {
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
    const originalPrice = cleanPrice(".price-standard");
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Penny(), "pennydomu_cz");
