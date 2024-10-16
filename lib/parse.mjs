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

/**
 * @param {object} document
 * @param {string} type
 * @returns {object|null}
 */
export function getLdJsonByType(document, type) {
  for (const scriptEl of document.querySelectorAll(`script[type="application/ld+json"]`)) {
    const scriptText = scriptEl.textContent;
    let scriptData;
    try { // important, as JSON can be malformed
      scriptData = JSON.parse(scriptText);
    } catch (err) {
      console.error(`Failed to parse JSON, skipping this script and continuing..., scriptText: ${scriptText}`);
      continue;
    }
    if (Array.isArray(scriptData)) { // although unusual, one script can contain multiple objects
      const found = scriptData.find(x => x["@type"] === type);
      if (found) return found;
    } else if (scriptData?.["@type"] === type) {
      return scriptData;
    }
  }
}
