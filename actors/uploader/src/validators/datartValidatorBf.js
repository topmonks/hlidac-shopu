function datartValidatorBf(item) {
  const updated = Object.assign({}, item);
  const attributes = [
    "category",
    "currency",
    "currentPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice"
  ];

  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
module.exports = { datartValidatorBf };
