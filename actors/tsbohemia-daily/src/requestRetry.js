import Apify from "apify";
import ProxyAgent from "proxy-agent";
import tough from "tough-cookie";
import got from "got";
import { getRandomInt } from "./utils.js";
import randomMua from "random-mua";
import { v4 as uuidv4 } from "uuid";

const sessions = {};
const proxyGroups = ["CZECH_LUMINATI"];
const MAX_SESSIONS = 150;

const stats = {
  success: 0,
  denied: 0,
  notFound: 0
};

setInterval(() => {
  console.log(`Got ${Object.keys(sessions).length} sessions`);
}, 30 * 1000);

setInterval(() => {
  console.log(stats);
}, 30 * 1000);

async function getSession() {
  const sessionCount = Object.keys(sessions).length;
  let pick = Math.random() > 0.4 && sessionCount > 10;
  if (!pick && sessionCount >= MAX_SESSIONS) {
    pick = true;
  }

  if (pick || sessionCount > MAX_SESSIONS) {
    const keys = Object.keys(sessions);
    const index = getRandomInt(0, keys.length - 1);
    const key = keys[index];
    return sessions[key];
  }

  const index = getRandomInt(0, 999999999);

  const proxyUrl = await Apify.getApifyProxyUrl({
    groups: proxyGroups,
    session: index.toString()
  });
  const session = {
    index,
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "*/*",
      "User-Agent": randomMua("m"),
      "x-platform-type": "mobile-html5",
      "x-client": "MWEB",
      "x-device-id": uuidv4(),
      authority: "m.olx.pl"
    },
    proxyUrl,
    usage: 0,
    maxUsage: getRandomInt(40, 100),
    agent: new ProxyAgent(proxyUrl),
    cookieJar: new tough.CookieJar(),
    json: true
  };
  sessions[index] = session;

  return session;
}

export async function getResponse(url) {
  const session = await getSession();
  const { agent, headers, cookieJar } = session;
  const options = {
    headers,
    agent: {
      https: agent,
      http: agent
    },
    retry: 3,
    timeout: 45 * 1000,
    cookieJar
  };

  try {
    const response = await got(url, options);
    try {
      const parsedBody = response.body;
      stats.success++;
      return parsedBody;
    } catch (e) {
      stats.denied++;
      delete sessions[session.index];
      throw new Error("Access Denied");
    }
  } catch (e) {
    if (e.statusCode && e.statusCode === 404) {
      stats.notFound++;
      return { notFound: true };
    }
    if (e.statusCode && e.statusCode === 403) {
      stats.denied++;
      delete sessions[session.index];
      throw new Error("Access Denied");
    }
    if (e instanceof got.TimeoutError) {
      throw new Error("Timeout");
    }
    throw e;
  }
}
