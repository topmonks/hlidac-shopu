export function kasaczValidator(item) {
  const attributes = [
    "itemId",
    "itemUrl",
    "itemName",
    "currentPrice",
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
