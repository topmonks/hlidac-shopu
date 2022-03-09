export function electroworldValidator(item) {
  const attributes = [
    "itemId",
    "img",
    "itemUrl",
    "itemName",
    "currentPrice",
    "originalPrice",
    "sale",
    "rating",
    "discounted",
    "category",
    "currency",
    "inStock"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
