function rohlikValidator(item) {
  const attributes = [
    "currency",
    "currentPrice",
    "currentUnitPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "originalUnitPrice",
    "inStock",
    "useUnitPrice"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { rohlikValidator };
