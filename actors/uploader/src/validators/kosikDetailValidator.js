export function kosikDetailValidator(item) {
  const updated = Object.assign({}, item);
  const attributes = ["identifier"];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
