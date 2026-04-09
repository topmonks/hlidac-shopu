import { cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

function findProductLd() {
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      if (data?.["@type"] === "Product") return data;
      if (Array.isArray(data)) {
        const p = data.find(x => x?.["@type"] === "Product");
        if (p) return p;
      }
      if (data?.["@graph"]) {
        const p = data["@graph"].find(x => x?.["@type"] === "Product");
        if (p) return p;
      }
    } catch {}
  }
  return null;
}

export class Lekarna extends Shop {
  get injectionPoint() {
    return ["afterend", "#priceBox"];
  }

  async scrape() {
    const data = findProductLd();
    if (!data) return null;

    const itemId = data.sku?.toString();
    const title = data.name;
    const currentPrice = data.offers?.price?.toString();

    // On discounted products Lekarna renders the *original* price as the big
    // `#priceBox .text-3xl.font-bold` element and the discounted current price
    // as a separate `<strong>` (also exposed via JSON-LD). On non-discounted
    // products only the big element exists and equals the current price.
    const originalPriceText = document.querySelector("#priceBox .text-3xl.font-bold")?.textContent;
    const originalPriceClean = cleanPriceText(originalPriceText ?? "");
    const originalPrice = originalPriceClean && originalPriceClean !== currentPrice ? originalPriceClean : null;

    const imageUrl = document.querySelector("[property='og:image']")?.content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Lekarna(), "lekarna");
