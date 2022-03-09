export function benuczValidator(item) {
  const attributes = [
    "category",
    "currentPrice",
    "discounted",
    "identifierSUKL",
    "img",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "url"
  ];
  for (const attr of attributes) {
    if (item[attr] === undefined) {
      item[attr] = null;
    }
  }

  return item;
}
