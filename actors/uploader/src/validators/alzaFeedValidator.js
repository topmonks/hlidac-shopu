export function alzaFeedValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "itemUrl",
    "img",
    "inStock",
    "currentPrice",
    "originalPrice",
    "currency",
    "discounted",
    "itemCode",
    "rating",
    "breadCrumbs"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
