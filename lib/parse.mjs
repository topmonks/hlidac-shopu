export function cleanPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("cca")) priceText = priceText.split("cca")[1];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

export function cleanUnitPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("/kg")) priceText = priceText.split("/kg")[0];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}
