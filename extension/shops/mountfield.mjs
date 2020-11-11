import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mountfield extends Shop {
  get injectionPoint() {
    return [
      "beforebegin",
      ".productCompare",
      {
        clear: "right",
        float: "right",
        width: "374px"
      }
    ];
  }

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
}

registerShop(new Mountfield(), "mountfield", "mountfield_sk");
