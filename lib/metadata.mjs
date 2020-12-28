/**
 * @param {string} name
 * @param {string} itemUrl
 * @returns {string}
 */
export function pkey(name, itemUrl) {
  return `${name}:${itemUrl}`;
}
