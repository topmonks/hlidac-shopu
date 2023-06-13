export function SmartyValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "itemUrl",
    "img",
    "originalPrice",
    "currentPrice",
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
  