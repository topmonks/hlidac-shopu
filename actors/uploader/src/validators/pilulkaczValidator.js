function pilulkaczValidator(item) {
  const attributes = [
    "availability",
    "category",
    "currentPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "shortDesc",
    "shop",
    "slug"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { pilulkaczValidator };
