import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";

const toPrice = value => (typeof value === "number" ? value : cleanPrice(value));

/**
 * Loose produce is listed per average piece (`price.actual` = `price.unitPrice` * `averageWeight`),
 * but its "předtím" promo price is per kg. Catch-weight products are listed per kg.
 * @param {object} product ProductType from the apollo cache
 * @param {number | undefined} originalPrice parsed from the non-Clubcard promo text
 */
export function extractPrices(product, originalPrice) {
  const price = product.price ?? {};
  const result = {
    currentPrice: toPrice(price.actual),
    currentUnitPrice: toPrice(price.unitPrice),
    discounted: false,
    useUnitPrice: product.productType === "LooseProduce" || product.productType === "CatchWeightProducts"
  };
  if (originalPrice) {
    result.discounted = true;
    result.originalPrice = originalPrice;
  }
  if (result.useUnitPrice) {
    result.unitOfMeasure = price.unitOfMeasure;
    result.originalUnitPrice = originalPrice;
    if (originalPrice && product.productType === "LooseProduce") {
      result.originalPrice = Math.round(originalPrice * product.averageWeight * 100) / 100;
    }
  }
  return result;
}
