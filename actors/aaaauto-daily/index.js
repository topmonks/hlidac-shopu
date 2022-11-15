import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, Dataset, log, LogLevel } from "apify";
import { CheerioCrawler } from "@crawlee/cheerio";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";

/** @typedef {import("apify").ProxyConfiguration} ProxyConfiguration */

export const Label = {
  START: "START",
  PAGE: "PAGE"
};
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

const categoryByCountry = new Map([
  [Country.CZ, "ojete-vozy"],
  [Country.SK, "ojazdene-vozidla"]
]);

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
  }
}

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
  }
}

/**
 *
 * @param {String} string
 * @returns {number|undefined}
 */
export function extractPrice(string) {
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
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export function getHumanDelayMillis(min = 400, max = 800) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function parseProducts(request, $, country) {
  const offers = $(".card");
  const products = await Promise.all(
    offers.map(async function () {
      try {
        const item = $(this);
        const link = item.find("a.fullSizeLink").attr("href");
        const figure = item.find("figure");
        const url = new URL(link);
        const itemId = url.searchParams.get("id");
        const itemName = item.find("h2 a").text().trim();
        const arr = itemName.split(",");

        const currentPrice = item
          .find("span[id*=garageHeart]")
          .attr("data-price");
        const actionPrice = extractPrice(
          item.find(".carPrice h3.error:not(.hide)").text()
        );
        let originalPrice = extractPrice(
          item.find(".carPrice .darkGreyAlt").text()
        );
        const description = item.find(".carFeatures p").text().trim();
        const carFeatures = item
          .find(".carFeaturesList li")
          .toArray()
          .map(feature => {
            return $(feature).text();
          });

        const [km, transmission, fuelType, engine] = carFeatures;
        return {
          itemUrl: link,
          itemId,
          description,
          img: figure.length > 0 ? figure.find("img").attr("src") : null,
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
      } catch (e) {
        log.error(e.message);
        log.error(`Products extraction failed on url: ${request.url}`);
      }
    })
  );

  for (const product of products) {
    await Dataset.pushData(product);
  }
}

export async function main() {
  const rollbar = Rollbar.init();

  const input = await Actor.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    type = ActorType.Full,
    proxyGroups = ["CZECH_LUMINATI"],
    country = Country.CZ
  } = input ?? {};

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const requestQueue = await Actor.openRequestQueue();
  await requestQueue.addRequest({
    url: getRootUrl(type, country),
    userData: {
      label: Label.START
    }
  });
  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestHandlerTimeoutSecs: 300,
    navigationTimeoutSecs: 300,
    async handlePageFunction({ request, $ }) {
      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);
      switch (label) {
        case Label.START:
          const pages = $("nav.pagenav li");
          const lastPage = parseInt(
            pages
              .eq(pages.length - 2)
              .find("a")
              .text()
              .trim()
          );

          for (let i = 0; i < lastPage; i++) {
            const pageNumber = i + 1;
            await requestQueue.addRequest({
              url: getBaseUrl(type, country, pageNumber),
              userData: { label: Label.PAGE, pageNumber }
            });
          }
          return parseProducts(request, $, country);
        case Label.PAGE:
          return parseProducts(request, $, country);
      }
    },
    async handleFailedRequestFunction({ error, request, body }) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, error);
      console.log(request.statusCode);
      console.log(error);
      console.log(body);
    }
  });
  await crawler.run();

  log.info("Crawler finished.");

  if (!development) {
    try {
      const postfix = type === ActorType.BlackFriday ? "_bf" : "";
      const tableName = `aaaauto_${country.toLocaleLowerCase()}${postfix}`;
      await uploadToKeboola(tableName);
    } catch (err) {
      rollbar.error(err);
      console.log(err);
    }
  }

  console.log("Finished.");
}
