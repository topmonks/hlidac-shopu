export function prozdraviczValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "description",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "blackFriday",
    "inStock"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
