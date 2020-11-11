import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mironet extends Shop {
  get injectionPoint() {
    return ["afterend", ".product_kosik_info"];
  }

  async scrape() {
    const elem = document.querySelector(".product_detail");
    if (!elem) return;
    const itemId = document.querySelector(
      ".product_kosik_info input[name=Code]"
    ).value;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".product_cena_box .product_dph");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph span");
    const imageUrl = document.getElementById("DetailImg").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mironet(), "mironet");
