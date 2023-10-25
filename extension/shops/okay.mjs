import { cleanPrice, registerShop, isElementVisible } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Okay extends Shop {
  selector = ".product-form-container";

  get injectionPoint() {
    return ["afterend", this.selector, { display: "block !important" }];
  }

  async scrape() {
    const elem = document.querySelector(this.selector);
    if (!elem) return;
    const product = JSON.parse(
      elem.querySelector("[data-product]").dataset.product
    );
    const itemId = product.id;
    const comparePrice = product.compare_at_price / 100;
    const currentPrice = product.price / 100;
    const originalPrice =
      product.compare_at_price !== product.price ? comparePrice : null;
    const title = product.title;
    const imageUrl = product.featured_image;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Okay(), "okay_cz", "okay_sk");
