export function obiValidator(item) {
  const attributes = [
    "category",
    "currency",
    "currentPrice",
    "discounted",
    "img",
    "inStock",
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
