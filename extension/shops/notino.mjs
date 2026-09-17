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

/**
 * Price of a conditional voucher. Price-based conditions ("Při nákupu od 500 Kč") are shown to everyone
 * on the product page, so the lowest tier counts even when a single item doesn't reach it (#3607).
 * Piece-based conditions ("Při nákupu od 2 ks") only count when the product already meets them.
 */
function conditionalVoucherPrice(voucher) {
  const conditions = voucher?.discountConditions ?? [];
  const met = conditions.find(c => c.productMeetsCondition);
  if (met) return met.discountedPrice;
  if (voucher?.conditionType !== "Price") return undefined;
  return conditions.toSorted((a, b) => a.conditionMin - b.conditionMin)[0]?.discountedPrice;
}

/** CZK prices are shown whole on the site, EUR (notino.sk) keeps cents */
function roundPrice(value, currency) {
  return currency === "CZK" ? Math.round(value) : Math.round(value * 100) / 100;
}

function pricesFromApollo(variant) {
  if (!variant?.price) return null;
  const voucherDiscountedPrice =
    variant.attributes?.VoucherDiscount?.discountedPrice ??
    conditionalVoucherPrice(variant.attributes?.ConditionalVoucherDiscount);
  const price = variant.price.value;
  const origPrice = variant.originalPrice?.value;
  const recentMinPrice = variant.recentMinPrice?.value;
  const round = value => roundPrice(value, variant.price.currency);

  if (voucherDiscountedPrice) {
    return {
      currentPrice: round(voucherDiscountedPrice),
      originalPrice: round(recentMinPrice ?? price)
    };
  }
  return {
    currentPrice: round(price),
    originalPrice:
      recentMinPrice && price < recentMinPrice && recentMinPrice < origPrice
        ? round(recentMinPrice)
        : origPrice != null
          ? round(origPrice)
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
    const itemId = document.querySelector("input[name=productId]")?.value;
    if (!itemId) return;
    // On a variant switch the URL changes before the productId input does;
    // wait for the DOM to catch up, otherwise the previous variant's chart sticks
    const urlItemId = location.pathname.match(/\/p-(\d+)\/?$/)?.[1];
    if (urlItemId && urlItemId !== itemId) return;

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
