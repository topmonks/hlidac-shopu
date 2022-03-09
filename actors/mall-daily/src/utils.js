import Apify from "apify";
import rp from "request-fixed-tunnel-agent";
import UserAgents from "user-agents";

export function getHeaders() {
  const userAgent = new UserAgents();
  return {
    "User-Agent": userAgent.toString()
  };
}

export async function requestRetry(options) {
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
