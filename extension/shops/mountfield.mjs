import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.js";

export class Mountfield extends Shop {
  async scrape() {
    const elem = document.querySelector(".productDetail");
    if (!elem) return;
    const itemId = document
      .querySelector(".j-barcode-text")
      .textContent.trim()
      .toLowerCase();
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".actionPrice.val");
    const originalPrice = cleanPrice(".retailPrice.val");
    const imageUrl = document.querySelector(".mainImage img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".productCompare");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup({
      clear: "right",
      float: "right",
      width: "338px"
    });
    elem.insertAdjacentElement("beforebegin", markup);
    return elem;
  }
}

registerShop(new Mountfield(), "mountfield", "mountfield_sk");
