import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

function getVariantUrl(itemId) {
  if (location.href.includes(itemId)) return location.href;
  // inject product variant into URL when missing
  return `${location.href}p-${itemId}`;
}

function getApolloVariant(itemId) {
  try {
    const el = document.getElementById("__APOLLO_STATE__");
    if (!el) return null;
    const data = JSON.parse(el.textContent.replace(/;/g, ""));
    return data[`CatalogVariant:${itemId}`] ?? null;
  } catch {
    return null;
  }
}

function pricesFromApollo(variant) {
  if (!variant?.price) return null;
  const voucherDiscountedPrice =
    variant.attributes?.VoucherDiscount?.discountedPrice ??
    variant.attributes?.ConditionalVoucherDiscount?.discountConditions?.find(c => c.productMeetsCondition)
      ?.discountedPrice;
  const price = variant.price.value;
  const origPrice = variant.originalPrice?.value;
  const recentMinPrice = variant.recentMinPrice?.value;

  if (voucherDiscountedPrice) {
    return {
      currentPrice: Math.round(voucherDiscountedPrice),
      originalPrice: Math.round(recentMinPrice ?? price)
    };
  }
  return {
    currentPrice: Math.round(price),
    originalPrice:
      recentMinPrice && price < recentMinPrice && recentMinPrice < origPrice
        ? Math.round(recentMinPrice)
        : origPrice != null
          ? Math.round(origPrice)
          : null
  };
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
    const itemId = document.querySelector("input[name=productId]").value;

    const variant = getApolloVariant(itemId);
    const prices = pricesFromApollo(variant);

    let currentPrice, originalPrice;
    if (prices) {
      currentPrice = prices.currentPrice;
      originalPrice = prices.originalPrice;
    } else {
      // Fallback to DOM scraping when Apollo state is unavailable
      currentPrice = cleanPrice("#pd-price");
      const lowestPrice = document
        .querySelector('[data-testid="product-specifications"]')
        ?.textContent.split("Poslední nejnižší cena")[1];
      originalPrice = lowestPrice ? cleanPriceText(lowestPrice) : null;
    }

    const imageUrl = document.getElementById("pd-image-main")?.src;
    const url = getVariantUrl(itemId);
    return { itemId, title, currentPrice, originalPrice, imageUrl, url };
  }
}

registerShop(new Notino(), "notino", "notino_sk");
