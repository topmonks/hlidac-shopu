import { KeyValueStore } from "apify";

/** @typedef {import("./stats.js").Stats} Stats */
/** @typedef {import("node:http").IncomingMessage} IncomingMessage */

/**
 *
 * @param session
 * @param {IncomingMessage} response
 * @param {Stats} stats
 */
export function checkResponseStatus(session, response, stats) {
  if (response.statusCode === 403) {
    stats.inc("denied");
    session.isBlocked();
    throw new Error("Access Denied");
  }
  if (response.statusCode === 200) stats.inc("ok");
  session.setCookiesFromResponse(response);
}

/**
 * Returns URLs for all pages except the first one.
 * @param {number} totalCount
 * @param {(pageNr: number) => string} urlFn
 * @returns {string[]} urls
 */
export function restPageUrls(totalCount, urlFn) {
  const urls = [];
  for (let pageNr = 2; pageNr <= totalCount; pageNr++) {
    urls.push(urlFn(pageNr));
  }
  return urls;
}

/**
 * Get Apify input with default values.
 * @param {object=} overrides
 */
export async function getInput(overrides) {
  return Object.assign(
    {
      type: process.env.TYPE,
      development: Boolean(process.env.TEST),
      proxyGroups: ["CZECH_LUMINATI"],
      maxRequestRetries: 3,
      debug: Boolean(process.env.DEBUG),
      urls: []
    },
    await KeyValueStore.getInput(),
    overrides
  );
}
