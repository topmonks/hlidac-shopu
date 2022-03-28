import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const { log } = Apify.utils;

const LABELS = {
  START: "START",
  PAGE: "PAGE"
};
const COUNTRY_TYPE = {
  CZ: "CZ",
  SK: "SK"
};

const getRootUrl = (type = ActorType.FULL, country = COUNTRY_TYPE.CZ) => {
  const origin = `https://www.aaaauto.${country.toLocaleLowerCase()}`;
  const root = {
    [COUNTRY_TYPE.CZ]: `${origin}/cz/cars.php?carlist=1&limit=50&page=1&modern-request&origListURL=%2Fojete-vozy%2F`,
    [COUNTRY_TYPE.SK]: `${origin}/sk/cars.php?carlist=1&limit=50&page=1&modern-request&origListURL=%2Fojazdene-vozidla%2F`
  }[country];

  return {
    [ActorType.TEST]: root.replace("limit=50", "limit=1"),
    [ActorType.FULL]: root,
    [ActorType.BF]: `${origin}/black-friday/?category=92&limit=50`
  }[type];
};

const getBaseUrl = (
  type = ActorType.FULL,
  country = COUNTRY_TYPE.CZ,
  page = 1
) => {
  const tld = country.toLocaleLowerCase();
  const origin = `https://www.aaaauto.${tld}`;
  const category = {
    [COUNTRY_TYPE.CZ]: "ojete-vozy",
    [COUNTRY_TYPE.SK]: "ojazdene-vozidla"
  }[country];

  return {
    [ActorType.TEST]: `${origin}/${tld}/cars.php?carlist=1&limit=1&page=1&modern-request&origListURL=%2F${category}%2F`,
    [ActorType.FULL]: `${origin}/${tld}/cars.php?carlist=1&limit=50&page=${page}&modern-request&origListURL=%2F${category}%2F`,
    [ActorType.BF]: `${origin}/black-friday/?category=92&limit=50&page=${page}`
  }[type];
};

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    type = ActorType.FULL,
    proxyGroups = ["CZECH_LUMINATI"],
    country = COUNTRY_TYPE.CZ
  } = input ?? {};

  const requestQueue = await Apify.openRequestQueue();

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  await requestQueue.addRequest({
    url: getRootUrl(type, country),
    userData: {
      label: LABELS.START
    }
  });
  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestTimeoutSecs: 300,
    handlePageTimeoutSecs: 300,
    handlePageFunction: async ({ request, $ }) => {
      log.info(`Scraping page ${request.url}`);
      if (request.userData.label === "START") {
        const pages = $("nav.pagenav li");
        const lastPage = pages
          .eq(pages.length - 2)
          .find("a")
          .text()
          .trim();
        await Array.from(
          { length: lastPage },
          (_value, index) => index + 1
        ).map(async pageNumber => {
          await requestQueue.addRequest({
            url: getBaseUrl(type, country, pageNumber),
            userData: { label: LABELS.PAGE, pageNumber }
          });
        });
      } else if (request.userData.label === "PAGE") {
        const offers = $(".card");
        const products = await Promise.allSettled(
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
                currency: country === COUNTRY_TYPE.CZ ? "Kč" : "Eur",
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
        // we don't need to block pushes, we will await them all at the end
        const allFulfilledProducts = products
          .filter(p => p.status === "fulfilled")
          .map(p => p.value);
        const requests = [Apify.pushData(allFulfilledProducts)];
        let sleepTotal = 0;
        for (const product of allFulfilledProducts) {
          requests.push(
            uploadToS3v2(s3, product, {
              category: "",
              inStock: true
            })
          );
        }
        sleepTotal += getHumanDelayMillis(250, 950);
        log.debug(`Found ${allFulfilledProducts.length} cars, ${request.url}`);
        // await all requests, so we don't end before they end
        await Promise.allSettled(requests);
        await Apify.utils.sleep(sleepTotal);
      }
    },
    handleFailedRequestFunction: async ({ error, request, body }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
      console.log(request.statusCode);
      console.log(error);
      console.log(body);
    }
  });
  await crawler.run();

  log.info("Crawler finished.");

  if (!development) {
    try {
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "aaaauto.cz");
      log.info("invalidated Data CDN");
      let tableName = `aaaauto_${country.toLocaleLowerCase()}`;
      if (type === ActorType.BF) {
        tableName = `${tableName}_bf`;
      }
      await uploadToKeboola(tableName);
    } catch (e) {
      console.log(e);
    }
  }

  console.log("Finished.");
});

/**
 *
 * @param {String} string
 * @returns {undefined|number}
 */
export function extractPrice(string) {
  const match = string.match(/[\d*\s]*\s[Kč|€]/g);
  if (match && match.length > 0) {
    const value = match[0]
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace("Cena", "");
    return parseInt(value);
  }
  return undefined;
}

export function getHumanDelayMillis(min = 400, max = 800) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
