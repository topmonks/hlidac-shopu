const Apify = require("apify");
const rp = require("request-fixed-tunnel-agent");
const UserAgents = require("user-agents");

function getHeaders() {
  const userAgent = new UserAgents();
  return {
    "User-Agent": userAgent.toString()
  };
}

async function requestRetry(options) {
  let lastError;
  for (let i = 0; i < 4; i++) {
    try {
      const response = await rp(options);
      return response;
    } catch (e) {
      lastError = e;
      await Apify.utils.sleep((i + 1) * 600);
    }
  }

  throw lastError;
}
module.exports = { requestRetry, getHeaders };
