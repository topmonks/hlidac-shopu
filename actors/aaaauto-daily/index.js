import { createHash } from "node:crypto";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
export const Label = {
  START: "START",
  PAGE: "PAGE"
};

/** @enum {string} */
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

const categoryByCountry = new Map([
  [Country.CZ, "ojete-vozy"],
  [Country.SK, "ojazdene-vozidla"]
]);

/**
 * @param {ActorType} type
 * @param {Country} country
 * @returns {string}
 */
export function getRootUrl(type = ActorType.Full, country = Country.CZ) {
  const tld = country.toLocaleLowerCase();
  const origin = `https://www.aaaauto.${tld}`;
  const category = categoryByCountry.get(country);
  const root = `${origin}/${tld}/cars.php?carlist=1&limit=50&page=1&modern-request&origListURL=%2F${category}%2F`;

  switch (type) {
    case ActorType.Full:
      return root;
    case ActorType.Test:
      return root.replace("limit=50", "limit=1");
    case ActorType.BlackFriday:
      return `${origin}/black-friday/?category=92&limit=50`;
    default:
      throw new Error(`Unknown actor type ${type}`);
  }
}

/**
 * @param {ActorType} type
 * @param {Country} country
 * @param {number} page
 * @returns {string}
 */
export function getBaseUrl(type = ActorType.Full, country = Country.CZ, page = 1) {
  const tld = country.toLocaleLowerCase();
  const origin = `https://www.aaaauto.${tld}`;
  const category = categoryByCountry.get(country);

  switch (type) {
    case ActorType.Test:
      return `${origin}/${tld}/cars.php?carlist=1&limit=1&page=1&modern-request&origListURL=%2F${category}%2F`;
    case ActorType.Full:
      return `${origin}/${tld}/cars.php?carlist=1&limit=50&page=${page}&modern-request&origListURL=%2F${category}%2F`;
    case ActorType.BlackFriday:
      return `${origin}/black-friday/?category=92&limit=50&page=${page}`;
    default:
      throw new Error(`Unknown actor type ${type}`);
  }
}

/**
 * @param {string} string
 * @returns {number|undefined}
 */
export function extractPrice(string) {
  if (!string) return;
  const match = string.match(/[\d*\s]*\s[Kč|€]/g);
  if (!match) return;

  const value = match[0].replace(/\s/g, "").replace("Kč", "").replace("€", "").replace("Cena", "");
  return parseInt(value);
}

/**
 * @param {Document} document
 * @param {string} country
 */
function parseProducts(document, country) {
  const offers = document.querySelectorAll(".card:has(a.fullSizeLink)");
  return offers.map(item => {
    const link = item.querySelector("a.fullSizeLink").href;
    const figure = item.querySelector("figure");
    const url = new URL(link);
    const itemId = url.searchParams.get("id");
    const itemName = item.querySelector("h2 a").innerText.trim();
    const arr = itemName.split(",");

    const currentPrice = item.querySelector("span[id*=garageHeart]").getAttribute("data-price");
    const actionPrice = extractPrice(item.querySelector(".carPrice h3.error:not(.hide)")?.innerText);
    const originalPrice = extractPrice(item.querySelector(".carPrice .darkGreyAlt")?.innerText);
    const description = item.querySelector(".carFeatures p").innerText.trim();
    const carFeatures = item.querySelectorAll(".carFeaturesList li").map(feature => feature.innerText);

    const [km, transmission, fuelType, engine] = carFeatures;
    return {
      itemUrl: link,
      itemId,
      description,
      img: figure.querySelector("img").getAttribute("src"),
      itemName: arr[0],
      currentPrice,
      originalPrice,
      currency: country === Country.CZ ? "Kč" : "Eur",
      actionPrice,
      discounted: !!originalPrice,
      year: arr[1] ? arr[1] : undefined,
      km,
      transmission,
      fuelType,
      engine
    };
  });
}

const ANUBIS_PASS_PATH = "/.within.website/x/cmd/anubis/api/pass-challenge";

/**
 * aaaauto.cz/.sk sits behind Anubis (Techaro BotStopper), a proof-of-work bot wall.
 * A cold HTTP request gets a tiny challenge page instead of the catalog, which is why
 * the actor silently returned 0 / far-too-few items. We solve the PoW in Node and replay
 * the pass-challenge endpoint to mint the `techaro.lol-anubis-auth` cookie - no browser.
 * @param {string} html
 * @returns {boolean}
 */
function isAnubisChallenge(html) {
  return html.includes('id="anubis_challenge"');
}

/**
 * Find a nonce so that sha256(randomData + nonce) has `difficulty` leading hex zeros.
 * Difficulty is 1 in practice (~16 tries), so this is microseconds.
 * @param {string} randomData
 * @param {number} difficulty
 * @returns {{ hash: string, nonce: number }}
 */
function solveAnubisPow(randomData, difficulty) {
  const prefix = "0".repeat(difficulty);
  for (let nonce = 0; ; nonce++) {
    const hash = createHash("sha256").update(`${randomData}${nonce}`).digest("hex");
    if (hash.startsWith(prefix)) return { hash, nonce };
  }
}

/**
 * Build the pass-challenge URL that mints the auth cookie for the given challenge page.
 * Handles both Anubis algorithms the site rotates through: `fast`/`slow` (PoW) and `metarefresh` (no PoW).
 * @param {string} html challenge page HTML
 * @param {string} pageUrl the URL we were trying to reach
 * @returns {string|null}
 */
function buildAnubisPassUrl(html, pageUrl) {
  const match = html.match(/<script id="anubis_challenge"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  const parsed = JSON.parse(match[1].trim());
  // An "oops" page (rejected/stale pass) carries a null challenge - bail so the caller retries cleanly.
  if (!parsed?.challenge || !parsed?.rules) return null;
  const { challenge, rules } = parsed;
  const { origin } = new URL(pageUrl);

  if (rules.algorithm === "metarefresh") {
    // The server already baked the full pass-challenge URL into the meta refresh tag.
    const meta = html.match(/http-equiv="refresh"[^>]*url=([^"]+)"/i);
    if (meta) return new URL(meta[1].replace(/&amp;/g, "&"), origin).toString();
    const params = new URLSearchParams({ challenge: challenge.randomData, id: challenge.id, redir: pageUrl });
    return `${origin}${ANUBIS_PASS_PATH}?${params}`;
  }

  const start = Date.now();
  const { hash, nonce } = solveAnubisPow(challenge.randomData, rules.difficulty);
  const params = new URLSearchParams({
    id: challenge.id,
    response: hash,
    nonce: String(nonce),
    redir: pageUrl,
    elapsedTime: String(1200 + (Date.now() - start))
  });
  return `${origin}${ANUBIS_PASS_PATH}?${params}`;
}

/**
 * Return the real HTML for `url`, transparently clearing the Anubis wall if it is served.
 * `sendRequest` reuses the crawler session's proxy + cookie jar, so the minted auth cookie
 * is stored and replayed on the session's subsequent page requests.
 * @param {{ url: string, html: string, sendRequest: Function }} args
 * @returns {Promise<string>}
 */
async function solveAnubisIfNeeded({ url, html, sendRequest }) {
  for (let attempt = 0; attempt < 3 && isAnubisChallenge(html); attempt++) {
    const passUrl = buildAnubisPassUrl(html, url);
    if (!passUrl) break;
    const response = await sendRequest({ url: passUrl });
    html = response.body.toString();
  }
  if (isAnubisChallenge(html)) {
    throw new Error(`AAAauto: failed to solve Anubis challenge for ${url}`);
  }
  return html;
}

export async function main() {
  const rollbar = Rollbar.init();

  const {
    development,
    debug,
    // AAA intermittently soft-blocks past Anubis with a "page not found" decoy, so each page may
    // need a few fresh-session retries to land a real catalog response. Default higher than Crawlee's 3.
    maxRequestRetries = 8,
    type = ActorType.Full,
    proxyGroups,
    country = Country.CZ
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats({
    urls: 0,
    failed: 0
  });

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 120,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestHandlerTimeoutSecs: 300,
    navigationTimeoutSecs: 300,
    async requestHandler({ request, body, sendRequest, session }) {
      const html = await solveAnubisIfNeeded({ url: request.url, html: body.toString(), sendRequest });
      const { document } = parseHTML(html);

      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);

      // Past Anubis, AAA intermittently returns a 200 OK "Stránka nenalezena" (page not found) decoy
      // that parses to zero products - a silent block. Retire the session (fresh proxy IP on retry)
      // and throw so Crawlee re-fetches the page instead of recording an empty success.
      const softBlocked = () => {
        session?.retire();
        throw new Error(`AAAauto: soft-block "page not found" decoy on ${request.url} - retrying with a fresh session`);
      };

      switch (label) {
        case Label.START:
          {
            const pages = document.querySelectorAll("nav.pagenav li");
            const lastPageLink = pages[pages.length - 2]?.querySelector("a");
            if (!lastPageLink) return softBlocked();
            const lastPage = parseInt(lastPageLink.innerText.trim());

            const requests = [];
            for (let i = 0; i < lastPage; i++) {
              const pageNumber = i + 1;
              requests.push({
                url: getBaseUrl(type, country, pageNumber),
                userData: { label: Label.PAGE, pageNumber }
              });
            }
            const products = parseProducts(document, country);
            await Promise.allSettled([crawler.requestQueue.addRequests(requests), Dataset.pushData(products)]);
          }
          break;
        case Label.PAGE:
          {
            const products = parseProducts(document, country);
            if (products.length === 0) return softBlocked();
            await Dataset.pushData(products);
          }
          break;
      }
      stats.inc("urls");
    },
    async failedRequestHandler({ request }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run([
    {
      url: getRootUrl(type, country),
      userData: {
        label: Label.START
      }
    }
  ]);
  log.info("Crawler finished.");

  if (!development) {
    try {
      const postfix = type === ActorType.BlackFriday ? "_bf" : "";
      const tableName = `aaaauto_${country.toLocaleLowerCase()}${postfix}`;
      await uploadToKeboola(tableName);
    } catch (err) {
      rollbar.error(err);
      log.error(err);
    }
  }

  log.info("Finished.");
}
