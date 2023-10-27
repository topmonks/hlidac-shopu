import { cleanPriceText } from "@hlidac-shopu/lib/parse.mjs";
import { Dataset } from "apify";

/** @typedef { import("./stats").Stats} Stats */

/**
 * Save unique products to dataset
 * @param {{products: object[], stats: Stats, processedIds: Object<string, Object>}} options
 * @returns {Promise<number>}
 */
export async function saveUniqProducts({ products, stats, processedIds }) {
  const newProducts = [];
  for (const product of products) {
    if (processedIds[product.itemId] !== product.currentPrice) {
      if (processedIds[product.itemId]) {
        stats.inc("itemsChanged");
      }
      processedIds[product.itemId] = product.currentPrice;
      newProducts.push(product);
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  await Dataset.pushData(newProducts);
  return products.length;
}

export function currencyToISO4217(currency) {
  switch (currency.toLowerCase()) {
    case "kč":
      return "CZK";
    case "€":
      return "EUR";
    default:
      return currency;
  }
}

export function cleanPrice(s) {
  if (!s) return null;
  const price = cleanPriceText(s);
  if (!price) return null;
  const number = parseFloat(price);
  if (isNaN(number)) return null;
  return number;
}

export * from "@hlidac-shopu/lib/parse.mjs";
