export function czcValidator(item) {
  const attributes = [
    "itemUrl",
    "itemId",
    "itemName",
    "currentPrice",
    "img",
    "category",
    "date",
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
