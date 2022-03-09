export function datartValidator(item) {
  // to fix the days where there was a bug with category
  const updated = Object.assign({}, item);
  if (updated.breadcrumbs) {
    updated.breadCrumbs = updated.breadcrumbs;
    delete updated.breadcrumbs;
  }
  const attributes = [
    "currency",
    "currentPrice",
    "discounted",
    "itemId",
    "itemName",
    "itemUrl",
    "originalPrice",
    "breadCrumbs"
  ];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
