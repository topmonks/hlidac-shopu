export function itescoValidator(item) {
  const updated = Object.assign({}, item);
  const attributes = [
    "currentPrice",
    "currentUnitPrice",
    "discounted",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "originalUnitPrice",
    "breadCrumbs",
    "unitOfMeasure",
    "useUnitPrice"
  ];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
