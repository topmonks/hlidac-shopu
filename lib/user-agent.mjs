/**
 * @param {string} ua User Agent string
 * @returns {boolean}
 */
export function isSocialMediaBot(ua) {
  // For more bots matches see https://github.com/monperrus/crawler-user-agents/blob/master/crawler-user-agents.json
  return Boolean(
    ua.match(/facebookexternalhit/) ||
      ua.match(/Twitterbot/) ||
      ua.match(/Slackbot/)
  );
}
