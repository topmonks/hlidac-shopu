function prozdraviczValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "description",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { prozdraviczValidator };
