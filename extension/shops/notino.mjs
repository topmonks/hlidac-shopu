import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

function getVariantUrl(itemId) {
  if (location.href.includes(itemId)) return location.href;
  // inject product variant into URL when missing
  return `${location.href}p-${itemId}`;
}

export class Notino extends AsyncShop {
  #selector = "#pdAddToCart";

  get injectionPoint() {
    return ["beforeend", this.#selector];
  }

  get waitForSelector() {
    return this.#selector;
  }

  async scrape() {
    const elem = document.querySelector(this.#selector);
    if (!elem) return;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice =
      cleanPrice("#pd-price");

    const lowestPrice = document.querySelector('[data-testid="product-specifications"]')?.textContent.split("Poslední nejnižší cena")[1];
    const originalPrice = lowestPrice ? cleanPriceText(lowestPrice) : null;
    const imageUrl = document.getElementById("pd-image-main")?.src;
    const itemId = document.querySelector("input[name=productId]").value;
    const url = getVariantUrl(itemId);
    return { itemId, title, currentPrice, originalPrice, imageUrl, url };
  }
}

registerShop(new Notino(), "notino", "notino_sk");
