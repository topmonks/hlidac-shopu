const { decycle } = require("./cycle");

const defaultLevels = ["debug", "info", "warn", "error"];
// eslint-disable-next-line no-process-env
const logLevels = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.split(",") : defaultLevels;

function normalizeLevel(level) {
  switch (level.toLowerCase()) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return level.toLowerCase();
    default:
      return "log";
  }
}

const logger = function logger(msg, level = "info") {
  if (!logLevels.includes(level)) return msg;

  const timestamp = new Date();
  const logObj = { timestamp, level };
  if (typeof msg === "object") {
    Object.assign(logObj, msg);
  } else {
    logObj[msg] = msg;
  }
  const formatLevel = process.env.PRETTY_LOG ? 2 : undefined; // eslint-disable-line no-process-env, no-undefined
  const logCall = normalizeLevel(level);
  console[logCall](JSON.stringify(decycle(logObj), undefined, formatLevel)); // eslint-disable-line no-console, no-undefined
  return msg;
}

logger.debug = function debug(msg) {
  return logger(msg, "debug")
};

logger.info = function info(msg) {
  return logger(msg, "info")
};

logger.warn = logger.warning = function warning(msg) { // eslint-disable-line no-multi-assign
  return logger(msg, "warn")
};

logger.err = logger.error = function error(msg) { // eslint-disable-line no-multi-assign
  return logger(msg, "error")
};

logger.fmtError = function fmtError(error, msg) {
  const { name, message, stack } = error;
  logger.error(Object.assign({ name, message, stack, text: error.toString() }, msg));
}

module.exports = logger
