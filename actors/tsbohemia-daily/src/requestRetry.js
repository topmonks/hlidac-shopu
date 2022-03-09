import Apify from "apify";
import ProxyAgent from "proxy-agent";
import tough from "tough-cookie";
import got from "got";
import { getRandomInt } from "./utils";
import headersProvider from "./headersProvider";

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
    // console.log(`Reused session ${key}`);
    return sessions[key];
  }

  const headers = headersProvider();
  const index = getRandomInt(0, 999999999);

  // const proxyConfiguration = await Apify.createProxyConfiguration({
  //     groups: ['CZECH_LUMINATI'], // List of Apify Proxy groups
  //     countryCode: 'CZ'
  // })
  // const proxyUrl = proxyConfiguration.newUrl(index.toString());
  const proxyUrl = await Apify.getApifyProxyUrl({
    groups: proxyGroups,
    session: index.toString()
  });
  const session = {
    index,
    headers,
    proxyUrl,
    // jar: requestPromise.jar(),
    usage: 0,
    maxUsage: getRandomInt(40, 100),
    agent: new ProxyAgent(proxyUrl),
    cookieJar: new tough.CookieJar(),
    json: true
  };
  sessions[index] = session;

  return session;
}

async function gotResponse(url) {
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

module.exports = { getResponse: gotResponse };
