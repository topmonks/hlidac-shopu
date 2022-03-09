export function tsbohemiaValidator(item) {
  const attributes = [
    "breadCrumbs",
    "currentPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "menuCat"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
