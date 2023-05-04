import { KeyValueStore, log, LogLevel } from "apify";

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
 * @template T
 * @param {string|number} totalCount
 * @param {(pageNr: number) => T} urlFn
 * @returns {T[]} urls
 */
export function restPageUrls(totalCount, urlFn) {
  const urls = [];
  for (let pageNr = 2; pageNr <= Number(totalCount); pageNr++) {
    urls.push(urlFn(pageNr));
  }
  return urls;
}

/**
 * Get Apify input with default values.
 * @param {object=} overrides
 */
export async function getInput(overrides) {
  const debug = Boolean(process.env.DEBUG);
  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }
  return Object.assign(
    {
      type: process.env.TYPE,
      development: Boolean(process.env.TEST),
      proxyGroups: ["CZECH_LUMINATI"],
      maxRequestRetries: 3,
      debug,
      urls: []
    },
    await KeyValueStore.getInput(),
    overrides
  );
}
