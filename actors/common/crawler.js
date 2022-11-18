/** @typedef {import("./stats.js").Stats} Stats */
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
