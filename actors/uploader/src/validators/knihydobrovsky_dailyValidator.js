export function knihydobrovsky_dailyValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "itemUrl",
    "img",
    "currentPrice",
    "originalPrice",
    "currency",
    "discounted",
    "rating",
    "inStock",
    "category",
    "breadCrumbs"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
