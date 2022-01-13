function tsbohemiaPriceValidator(item) {
  item["PriceFeedOnly"] = "true";
  const attributes = ["itemId", "currentPrice", "originalPrice", "discounted"];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}

module.exports = { tsbohemiaPriceValidator };
