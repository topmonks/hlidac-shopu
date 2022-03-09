export function aaaautoValidator(item) {
  const attributes = [
    "actionPrice",
    "currency",
    "currentPrice",
    "description",
    "discounted",
    "engine",
    "fuelType",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "km",
    "originalPrice",
    "transmission",
    "year"
  ];

  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
