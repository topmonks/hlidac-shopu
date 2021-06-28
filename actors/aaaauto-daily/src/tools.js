const Apify = require("apify");
const routes = require("./routes");

const { log } = Apify.utils;
/**
 *
 * @param {String} string
 * @returns {undefined|number}
 */
exports.extractPrice = string => {
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
};

exports.getHumanDelayMillis = (min = 400, max = 800) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Create router
exports.createRouter = globalContext => {
  return async function (routeName, requestContext) {
    const route = routes[routeName];
    if (!route) throw new Error(`No route for name: ${routeName}`);
    log.debug(`Invoking route: ${routeName}`);
    return route(requestContext, globalContext);
  };
};
