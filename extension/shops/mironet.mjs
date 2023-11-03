import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mironet extends Shop {
  selector = ".product_btn_kosik";
  get injectionPoint() {
    return ["afterend", this.selector];
  }

  async scrape() {
    const elem = document.querySelector(this.selector);
    if (!elem) return;
    const itemId = elem.querySelector("input[name=Code]").value;
    const title = elem.querySelector("input[name=NameItem]").value;
    const currentPrice = cleanPrice(".product_cena_box .product_dph");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph span");
    const imageUrl = document.getElementById("DetailImg").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mironet(), "mironet");
