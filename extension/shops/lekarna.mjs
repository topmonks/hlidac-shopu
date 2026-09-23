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

    // On discounted products Lekarna renders the original price as a
    // `#priceBox .line-through` element labelled "Před slevou:". Non-discounted
    // products have no such element, so the selector simply misses.
    const crossedPrice = cleanPriceText(document.querySelector("#priceBox .line-through")?.textContent);
    // A coupon ("Do košíku s kódem …") box follows an automatic-discount form.
    // Mirror the lekarna-daily actor: the coupon price is the current price,
    // and without a crossed-out price the regular price is the original one.
    const couponPrice = cleanPriceText(
      document.querySelector("#priceBox form[id*='productAutomaticDiscount'] + * strong")?.textContent
    );
    const regularPrice = cleanPriceText(document.querySelector("#priceBox span.text-3xl.font-bold")?.textContent);
    const currentPrice = couponPrice ?? data.offers?.price?.toString();
    const originalPrice = crossedPrice ?? (couponPrice ? regularPrice : null);

    const imageUrl = document.querySelector("[property='og:image']")?.content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Lekarna(), "lekarna");
