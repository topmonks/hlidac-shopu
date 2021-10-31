function notinoValidator(item) {
  const attributes = [
    "currentPrice",
    "discounted",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "breadCrumbs"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
module.exports = { notinoValidator };
