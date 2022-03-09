export function itescoValidator(item) {
  const updated = Object.assign({}, item);
  const attributes = [
    "currentPrice",
    "discounted",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "breadCrumbs",
    "unitOfMeasure"
  ];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
