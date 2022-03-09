export function lidlValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "discounted",
    "id",
    "itemId",
    "itemName",
    "itemUrl",
    "mainCategory",
    "originalPrice",
    "breadCrumbs"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
