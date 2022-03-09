export function mountfieldValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "discounted",
    "id",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "mainCategory",
    "originalPrice"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
