function mironetValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "discounted",
    "currentPrice",
    "originalPrice"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { mironetValidator };
