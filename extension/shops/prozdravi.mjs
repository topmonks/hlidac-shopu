import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Prozdravi extends Shop {
  get injectionPoint() {
    return ["afterend", ".justify-content-end"];
  }

  async scrape() {
    const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[0];
    if (!jsonld)
      return null;
    try {
      const data = JSON.parse(jsonld.innerText)[0];
      if (data["@type"] !== "Product")
        return null;
      const originalPrice = cleanPrice(".old-price span");
      return {
        itemId: null,
        title: data.name,
        currentPrice: parseFloat(data.offers.price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        imageUrl: data.image
      };
    } catch (e11) {
      console.error("Could not find product info", e11);
    }
  }
}

registerShop(new Prozdravi(), "prozdravi");
