function megaknihyValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "discounted",
    "id",
    "itemId",
    "itemName",
    "slug",
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
module.exports = { megaknihyValidator };
