// @ts-check
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, Dataset, log, LogLevel } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { parseHTML } from "linkedom";

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
export function getBaseUrl(
  type = ActorType.Full,
  country = Country.CZ,
  page = 1
) {
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

  const value = match[0]
    .replace(/\s/g, "")
    .replace("Kč", "")
    .replace("€", "")
    .replace("Cena", "");
  return parseInt(value);
}

/**
 * @param {Document} document
 * @param {string} country
 */
function parseProducts(document, country) {
  const offers = document.querySelectorAll(".card");
  return offers.map(item => {
    const link = item.querySelector("a.fullSizeLink").getAttribute("href");
    const figure = item.querySelector("figure");
    const url = new URL(link);
    const itemId = url.searchParams.get("id");
    const itemName = item.querySelector("h2 a").innerText.trim();
    const arr = itemName.split(",");

    const currentPrice = item
      .querySelector("span[id*=garageHeart]")
      .getAttribute("data-price");
    const actionPrice = extractPrice(
      item.querySelector(".carPrice h3.error:not(.hide)")?.innerText
    );
    const originalPrice = extractPrice(
      item.querySelector(".carPrice .darkGreyAlt")?.innerText
    );
    const description = item.querySelector(".carFeatures p").innerText.trim();
    const carFeatures = item
      .querySelectorAll(".carFeaturesList li")
      .map(feature => feature.innerText);

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

export async function main() {
  const rollbar = Rollbar.init();

  const input = (await Actor.getInput()) ?? {};
  const {
    development = process.env.TEST,
    debug = false,
    maxRequestRetries = 3,
    type = ActorType.Full,
    proxyGroups = ["CZECH_LUMINATI"],
    country = Country.CZ
  } = input;

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 200,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestHandlerTimeoutSecs: 300,
    navigationTimeoutSecs: 300,
    async requestHandler({ request, body }) {
      const { document } = parseHTML(body.toString());

      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);
      switch (label) {
        case Label.START:
          {
            const pages = document.querySelectorAll("nav.pagenav li");
            const lastPage = parseInt(
              pages[pages.length - 2].querySelector("a").innerText.trim()
            );

            const requests = [];
            for (let i = 0; i < lastPage; i++) {
              const pageNumber = i + 1;
              requests.push({
                url: getBaseUrl(type, country, pageNumber),
                userData: { label: Label.PAGE, pageNumber }
              });
            }
            const products = parseProducts(document, country);
            await Promise.allSettled([
              crawler.requestQueue.addRequests(requests),
              Dataset.pushData(products)
            ]);
          }
          break;
        case Label.PAGE:
          {
            const products = parseProducts(document, country);
            await Dataset.pushData(products);
          }
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, error);
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
