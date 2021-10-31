function dmValidator(item) {
  const attributes = [
    "itemId",
    "itemName",
    "itemUrl",
    "img",
    "currentPrice",
    "originalPrice",
    "currency",
    "category",
    "discounted",
    "breadCrumbs",
    "inStok"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}

module.exports = { dmValidator };
