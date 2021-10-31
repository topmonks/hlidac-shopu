function lekarnaValidator(item) {
  const attributes = [
    "itemId",
    "itemUrl",
    "itemName",
    "currentPrice",
    "originalPrice",
    "discountedName",
    "breadCrumbs",
    "currency",
    "mainCategory"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { lekarnaValidator };
