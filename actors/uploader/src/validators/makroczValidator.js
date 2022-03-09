export function makroczValidator(item) {
  const updated = { ...item };
  const attributes = [
    "category",
    "currency",
    "currentPrice",
    "discounted",
    "img",
    "itemId",
    "itemName",
    "url"
  ];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
