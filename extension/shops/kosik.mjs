import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Kosik extends StatefulShop {
  get injectionPoint() {
    return ["afterend", ".product-detail__cart, .product-detail__cart-info"];
  }

  get detailSelector() {
    return ".product-detail__main-info";
  }

  get observerTarget() {
    return document.querySelector(".product-overlay-content");
  }

  shouldRender(mutations) {
    return this.didMutate(mutations, "addedNodes", "mfp-wrap");
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "mfp-wrap");
  }

  async scrape() {
    const elem = document.querySelector(
      "#snippet-addProductToCartForm->.amount[product-data]"
    );
    if (!elem) return;
    try {
      const json = elem.getAttribute("product-data");
      const data = JSON.parse(json);
      const originalPrice = cleanPrice(
        ".price__old-price.price__old-price--exists"
      );
      const imageUrl = document.querySelector(".product-detail__image").src;

      return {
        itemId: data.id,
        title: data.itemName,
        currentPrice: data.stepPrice,
        originalPrice,
        imageUrl
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  }
}

registerShop(new Kosik(), "kosik");
