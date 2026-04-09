import { registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

function findProductLd() {
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      if (data?.["@type"] === "Product") return data;
    } catch {}
  }
  return null;
}

function extractImageUrl(image) {
  const first = Array.isArray(image) ? image[0] : image;
  if (!first) return undefined;
  if (typeof first === "string") return first;
  return first.contentUrl ?? first.url;
}

export class Ikea extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".js-instore-under-buy-module,.pip-buy-module"];
  }

  async scrape() {
    const data = findProductLd();
    if (!data) return;
    try {
      let originalPrice, currentPrice;
      if (data.offers["@type"] === "Offer") {
        originalPrice = null;
        currentPrice = data.offers.price;
      } else if (data.offers["@type"] === "AggregateOffer") {
        originalPrice = data.offers.highPrice;
        currentPrice = data.offers.lowPrice;
      }
      return {
        itemId: data.sku.replaceAll(".", ""),
        title: data.name,
        currentPrice,
        originalPrice,
        imageUrl: extractImageUrl(data.image)
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  }
}

registerShop(new Ikea(), "ikea_cz", "ikea_sk");
