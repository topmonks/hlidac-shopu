export function rozetkaValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "itemUrl",
    "itemImg",
    "currentPrice",
    "originalPrice",
    "category",
    "currency",
    "discounted",
    "inStock",
    "rating",
    "sale",
    "slug"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
