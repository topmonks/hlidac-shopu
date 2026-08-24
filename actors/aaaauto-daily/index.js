import { HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
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
 * @param {Country} country
 * @returns {string}
 */
function originFor(country) {
  return `https://www.aaaauto.${country.toLocaleLowerCase()}`;
}

/**
 * @param {ActorType} type
 * @param {Country} country
 * @returns {string}
 */
export function getRootUrl(type = ActorType.Full, country = Country.CZ) {
  return getBaseUrl(type, country, 1);
}

/**
 * @param {ActorType} type
 * @param {Country} country
 * @param {number} page
 * @returns {string}
 */
export function getBaseUrl(type = ActorType.Full, country = Country.CZ, page = 1) {
  // The old site had a dedicated Black Friday listing (`/black-friday/?category=92`). That URL is
  // gone with the redesign and no replacement is known yet, so fail loudly rather than silently
  // scrape the full catalog into the `_bf` table. Revisit when the BF section goes live. See #3580.
  if (type === ActorType.BlackFriday) {
    throw new Error("AAAauto: Black Friday URL is unknown after the site redesign - not yet supported (see #3580)");
  }
  const category = categoryByCountry.get(country);
  return `${originFor(country)}/${category}/?page=${page}`;
}

/**
 * aaaauto.cz/.sk was rebuilt as an Angular SSR app: the old `cars.php` endpoint 404s and the
 * catalog now ships as embedded JSON in a `<script type="application/json">` TransferState blob.
 * Pull the `car-list` message out of it - no browser, no DOM scraping of car cards.
 * @param {Document} document
 * @returns {{ items: object[], pagination: { totalPages: number } }|null}
 */
export function extractCarList(document) {
  const scripts = document.querySelectorAll('script[type="application/json"]');
  for (const script of scripts) {
    const text = script.textContent;
    if (!text || !text.includes('"car-list"')) continue;
    try {
      return JSON.parse(text)["car-list"]?.message ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {object[]} items
 * @param {Country} country
 */
export function parseProducts(items, country) {
  const tld = country.toLocaleLowerCase();
  return items
    .filter(item => !item.isSold)
    .map(item => {
      const itemUrl = `https://www.aaaauto.${tld}/detail/${item.make?.slug}/${item.model?.slug}/${item.id}`;
      const currentPrice = item.price?.cash;
      const oldCash = Number(item.price?.oldCash);
      const discounted = oldCash > 0 && oldCash > Number(currentPrice);
      return {
        itemUrl,
        itemId: String(item.id),
        description: item.webHeadline,
        img: item.photos?.default?.[0],
        itemName: item.displayTitle,
        currentPrice,
        originalPrice: discounted ? oldCash : undefined,
        currency: country === Country.CZ ? "Kč" : "Eur",
        actionPrice: discounted ? Number(currentPrice) : undefined,
        discounted,
        year: item.productionYear,
        km: item.mileage != null ? `${item.mileage} ${item.mileageUnit ?? "km"}` : undefined,
        transmission: item.gearbox?.title,
        fuelType: item.fuel?.title,
        engine: item.engine?.title
      };
    });
}

export async function main() {
  const rollbar = Rollbar.init();

  const {
    development,
    debug,
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
    async requestHandler({ request, body, session }) {
      const { document } = parseHTML(body.toString());
      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);

      // A response without the car-list payload is an SSR miss / soft-block. Retire the session
      // (fresh proxy IP on retry) and throw so Crawlee re-fetches instead of recording an empty success.
      const message = extractCarList(document);
      const softBlocked = () => {
        session?.retire();
        throw new Error(`AAAauto: missing car-list payload on ${request.url} - retrying with a fresh session`);
      };
      if (!message) return softBlocked();

      const products = parseProducts(message.items ?? [], country);
      if (products.length === 0) return softBlocked();
      await Dataset.pushData(products);

      if (label === Label.START && type !== ActorType.Test) {
        const totalPages = message.pagination?.totalPages ?? 1;
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push({
            url: getBaseUrl(type, country, page),
            userData: { label: Label.PAGE, pageNumber: page }
          });
        }
        if (requests.length) await crawler.requestQueue.addRequests(requests);
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
