/**
 *
 * @param {String} string
 * @returns {undefined|number}
 */
export function extractPrice(string) {
  const match = string.match(/[\d*\s]*\s[Kč|€]/g);
  if (match && match.length > 0) {
    const value = match[0]
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace("Cena", "");
    return parseInt(value);
  }
  return undefined;
}

export function getHumanDelayMillis(min = 400, max = 800) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
