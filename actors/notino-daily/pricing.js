/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * Price of a conditional voucher. Price-based conditions ("Při nákupu od 500 Kč") are shown to everyone
 * on the product page, so the lowest tier counts even when a single item doesn't reach it (#3607).
 * Piece-based conditions ("Při nákupu od 2 ks") only count when the product already meets them.
 */
export function conditionalVoucherPrice(voucher) {
  const conditions = voucher?.discountConditions ?? [];
  const met = conditions.find(c => c.productMeetsCondition);
  if (met) return met.discountedPrice;
  if (voucher?.conditionType !== "Price") return undefined;
  return conditions.toSorted((a, b) => a.conditionMin - b.conditionMin)[0]?.discountedPrice;
}

/**
 * Variant with the Black Friday badge. The badge comes from its voucher being tagged `blackfriday`
 * (`VoucherDiscount` or `ConditionalVoucherDiscount`, any voucher code). The `/black-friday/` listing
 * also shows sponsored products without the badge, those are not Black Friday products (#3672).
 * @param {Object} variant Apollo `CatalogVariant`
 * @returns {boolean}
 */
export function isBlackFridayVariant(variant) {
  const { VoucherDiscount, ConditionalVoucherDiscount } = variant?.attributes ?? {};
  return [VoucherDiscount, ConditionalVoucherDiscount].some(voucher => voucher?.tags?.includes("blackfriday"));
}

/** CZK prices are shown whole on the site, EUR (notino.sk) keeps cents */
export function roundPrice(value, currency) {
  return currency === "CZK" ? Math.round(value) : Math.round(value * 100) / 100;
}

/**
 * Struck-through price of each variant, as the product page declares it in its JSON-LD offers
 * (`priceSpecification.priceType` = `StrikethroughPrice`). Keyed by the variant's webId (`/p-<webId>/`
 * in the offer url), an offer without an id in its url (single-variant product) is keyed by "".
 * @param {Document} document
 * @returns {Map<string, number>}
 */
export function strikethroughPrices(document) {
  const prices = new Map();
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }
    for (const item of [data].flat()) {
      if (item?.["@type"] !== "Product") continue;
      const offers = [item.offers ?? []].flat();
      for (const offer of offers) {
        const strikethrough = [offer?.priceSpecification ?? []]
          .flat()
          .find(spec => String(spec?.priceType).endsWith("StrikethroughPrice"));
        const price = Number(strikethrough?.price);
        if (!price) continue;
        const webId = offer.url?.match(/\/p-(\d+)\/?$/)?.[1] ?? (offers.length === 1 ? "" : null);
        if (webId !== null) prices.set(webId, price);
      }
    }
  }
  return prices;
}

/**
 * Current and original price of an Apollo `CatalogVariant`.
 *
 * A voucher everyone can use is the current price and the regular price is the original one - that is
 * the price the product page crosses out (#3607, #3663). Without a voucher the original price is only
 * what the page crosses out (`strikethroughPrice` from the JSON-LD offers). The Apollo `originalPrice`
 * is the historical maximum (`type: "HistoricalMax"`) and `recentMinPrice` is the lowest price of the
 * last 30 days, the page shows neither of them crossed out, so neither is the original price.
 * @param {Object} variant Apollo `CatalogVariant`
 * @param {number} [strikethroughPrice] struck-through price of the variant from the JSON-LD offers
 * @returns {{currentPrice: number, originalPrice: number | null, currency: string}}
 */
export function variantPrices(variant, strikethroughPrice) {
  const currency = variant.price.currency;
  const price = variant.price.value;
  const voucherPrice =
    variant.attributes?.VoucherDiscount?.discountedPrice ??
    conditionalVoucherPrice(variant.attributes?.ConditionalVoucherDiscount);

  const hasVoucher = voucherPrice > 0 && voucherPrice < price;
  const currentPrice = roundPrice(hasVoucher ? voucherPrice : price, currency);
  const original = hasVoucher ? price : strikethroughPrice;
  const originalPrice = original ? roundPrice(original, currency) : null;
  return {
    currentPrice,
    // a "discount" to the same or a lower price is not a discount
    originalPrice: originalPrice > currentPrice ? originalPrice : null,
    currency
  };
}
