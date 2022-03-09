export function ikeaValidator(item) {
  const attributes = [
    "itemName",
    "itemUrl",
    "currentPrice",
    "originalPrice",
    "discounted",
    "inStock",
    "itemId",
    "itemImg",
    "sale",
    "currency",
    "rating",
    "numberOfReviews",
    "category",
    "slug"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }
  return item;
}
