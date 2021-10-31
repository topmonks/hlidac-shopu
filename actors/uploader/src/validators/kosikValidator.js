function kosikValidator(item) {
  const updated = Object.assign({}, item);
  const attributes = [
    "currentPrice",
    "discounted",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "breadCrumbs",
    "inStock"
  ];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
module.exports = { kosikValidator };
