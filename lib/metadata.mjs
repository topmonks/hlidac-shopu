/**
 * @param {string} name
 * @param {string} itemUrl
 * @returns {string | null}
 */
export function pkey(name, itemUrl) {
  if (!(name && itemUrl)) return null;
  return `${name}:${itemUrl}`;
}
