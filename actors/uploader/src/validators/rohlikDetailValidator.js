function rohlikDetailValidator(item) {
  const updated = Object.assign({}, item);
  const attributes = ["identifier"];
  for (const attr of attributes) {
    if (updated[attr] === undefined) {
      updated[attr] = null;
    }
  }

  return updated;
}
module.exports = { rohlikDetailValidator };
