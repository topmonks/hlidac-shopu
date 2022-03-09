export function mallValidator(item) {
  const attributes = [
    "itemId",
    "img",
    "itemName",
    "originalPrice",
    "currentPrice",
    "itemUrl",
    "productId",
    "originalPriceFromXhr",
    "breadCrumbs",
    "thirdPartySeller",
    "currency",
    "reviewStats",
    "reviews",
    "slug"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
