import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Globus extends StatefulShop {
  get injectionPoint() {
    return ["beforebegin", "#detail-tabs-content"];
  }

  get detailSelector() {
    return "#detail-container";
  }

  get observerTarget() {
    return document.body;
  }

  shouldRender(mutations) {
    return this.didMutate(mutations, "addedNodes", "modal-backdrop");
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "modal-backdrop");
  }

  async scrape() {
    const elem = document.querySelector("#detail-container");
    if (!elem) return;
    const itemId = elem.getAttribute("data-stock-item-code");
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".detail-price-now");
    const originalPrice = cleanPrice(".product-discount strong");
    const imageUrl = document.querySelector(".detail-image img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Globus(), "iglobus");
