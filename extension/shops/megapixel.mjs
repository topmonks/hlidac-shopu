import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Megapixel extends Shop {
  get injectionPoint() {
    return ["beforebegin", "section.half-content-box"];
  }

  async scrape() {
    const elem = document.querySelector("div#snippet--price");
    if (!elem) return;
    let itemId = document.querySelector("[data-product-item-id]")?.getAttribute("data-product-item-id");
    // Some products do not have [data-product-item-id], e.g. https://www.megapixel.cz/peak-design-micro-clutch-i-plate
    itemId ??= document.querySelector(".product-detail a[href^='/hlidaci-pes-produktu?item=']")?.href.split("=")[1];
    const title = document.querySelector("h1").innerText.trim();
    const currentPrice = cleanPrice(".product-detail__price-vat");
    const originalPrice = cleanPrice(".product-detail__price del");
    const imageUrl = document.querySelector(".product-detail__main-img a").href;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Megapixel(), "megapixel_cz");
