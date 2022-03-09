export function kasaczValidatorBf(item) {
  const attributes = [
    "category",
    "currentPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
