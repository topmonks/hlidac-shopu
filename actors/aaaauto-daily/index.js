import { HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, Dataset, LogLevel, log } from "apify";

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

const PAGE_SIZE = 35;
// The listing HTML puts this placeholder into photos.default for cars without photos, the API leaves it empty.
const NO_PHOTO_IMG = "https://static.aaaauto.eu/img/nophoto/nophoto-big.jpg";

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
  const params = new URLSearchParams({
    withEquipCat: "1",
    responseFormat: "list",
    withCount: "1",
    limit: String(PAGE_SIZE),
    skip: String((page - 1) * PAGE_SIZE),
    sort: "17",
    withDetails: "1"
  });
  return `${originFor(country)}/api/cars?${params}`;
}

/**
 * The listing HTML sits behind the Anubis bot wall, the `/api/cars` endpoint its pagination calls
 * does not. Its `message` has the same shape as the `car-list` payload embedded in the HTML.
 * @param {ActorType} type
 * @param {Country} country
 * @param {number} page
 * @param {object} userData
 */
function listingRequest(type, country, page, userData) {
  return {
    url: getBaseUrl(type, country, page),
    method: "POST",
    payload: "{}",
    headers: {
      Accept: "application/json",
      "Accept-Language": country === Country.SK ? "sk" : "cs",
      "Content-Type": "application/json"
    },
    userData
  };
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
        // Price-history key; must equal itemSlug(itemUrl) - pinned in lib/shops.test.mjs.
        // Not imported: the actor image installs the published lib. See actors/AGENT.md.
        slug: String(item.id),
        description: item.webHeadline,
        img: item.photos?.default?.[0] ?? NO_PHOTO_IMG,
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
    async requestHandler({ request, json, session }) {
      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);

      // A response without the car-list payload is a soft-block. Retire the session
      // (fresh proxy IP on retry) and throw so Crawlee re-fetches instead of recording an empty success.
      const message = json?.message;
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
          requests.push(listingRequest(type, country, page, { label: Label.PAGE, pageNumber: page }));
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
      ...listingRequest(type, country, 1, { label: Label.START }),
      // Only page 1 knows the page count, so one failed page 1 loses the whole day.
      maxRetries: Math.max(maxRequestRetries, 10)
    }
  ]);
  log.info("Crawler finished.");

  const { urls, failed } = stats.get();
  if (!urls) {
    throw new Error(`AAAauto: no products scraped (${failed} failed requests) - blocked or site structure changed`);
  }

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
