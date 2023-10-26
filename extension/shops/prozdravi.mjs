import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Prozdravi extends AsyncShop {
  get injectionPoint() {
    return ["afterend", ".justify-content-end"];
  }

  get waitForSelector() {
    return ".delivery-info";
  }

  async scrape() {
    // This page contains JSON-LD with product info, but it is loaded only
    // on direct navigation/reload.
    // We have to scrape data from DOM, that is actually mutated.
    const currentPrice = cleanPrice(".price span");
    if (!currentPrice) return null;
    const title = document.querySelector("h1").textContent.trim();
    const originalPrice = cleanPrice(".old-price span");
    const imageUrl = document.querySelector("img.product-image").src;
    return {
      itemId: null, // ID is nowhere on the page
      title,
      currentPrice: parseFloat(currentPrice),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      imageUrl
    };
  }
}

registerShop(new Prozdravi(), "prozdravi");
