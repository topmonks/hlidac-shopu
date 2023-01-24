/**
 * @param {string} priceText
 * @returns {string|null}
 */
export function cleanPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("cca")) priceText = priceText.split("cca")[1];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

/**
 * @param {string} priceText
 * @returns {string|null}
 */
export function cleanUnitPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("/kg")) priceText = priceText.split("/kg")[0];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

/**
 * @param {string|null} text
 * @returns {number|null}
 */
export function parseIntText(text) {
  return text ? parseInt(text.replace(/\s+/g, ""), 10) : null;
}

/**
 * @param {string|null} text
 * @returns {number|null}
 */
export function parseFloatText(text) {
  return text ? parseFloat(text.replace(/\s+/g, "")) : null;
}
