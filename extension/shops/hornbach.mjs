import { registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Hornbach extends Shop {
  get injectionPoint() {
    return ["afterend", `section[data-testid="product-informations"]`];
  }

  async scrape() {
    const elems = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    if (!elems) return;
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      if (script.textContent.includes(`"@type":"Product"`)) {
        const article = JSON.parse(script.textContent);
        return {
          itemId: article.sku,
          title: article.name,
          currentPrice: parseFloat(article.offers[0]?.price),
          originalPrice: null,
          imageUrl: article.image[0].url
        };
      }
    }
  }
}

registerShop(new Hornbach(), "hornbach_cz", "hornbach_sk");
