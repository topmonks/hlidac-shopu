import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, log, LogLevel } from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { sleep } from "@crawlee/utils";
import { CheerioCrawler } from "@crawlee/cheerio";
import {
  Country,
  extractPrice,
  getBaseUrl,
  getHumanDelayMillis,
  getRootUrl,
  Label
} from "./index.js";

/** @typedef {import("apify").ProxyConfiguration} ProxyConfiguration */

async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const input = await Actor.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    type = ActorType.FULL,
    proxyGroups = ["CZECH_LUMINATI"],
    country = Country.CZ
  } = input ?? {};

  const requestQueue = await Actor.openRequestQueue();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

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

  async function parseProducts(request, $) {
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

    const requests = [];
    let sleepTotal = 0;
    for (const product of products) {
      sleepTotal += getHumanDelayMillis(250, 950);
      requests.push(
        Dataset.pushData(product),
        uploadToS3v2(s3, product, {
          category: "",
          inStock: true
        })
      );
    }
    // await all requests, so we don't end before they end
    await Promise.all(requests);
    log.debug(`Found ${requests.length / 2} cars, ${request.url}`);
    await sleep(sleepTotal);
  }

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
    requestTimeoutSecs: 300,
    handlePageTimeoutSecs: 300,
    async handlePageFunction({ request, $ }) {
      log.info(
        `Label: ${request.userData.label} - Scraping page ${request.url}`
      );
      if (request.userData.label === "START") {
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
        await parseProducts(request, $);
      } else if (request.userData.label === "PAGE") {
        await parseProducts(request, $);
      }
    },
    async handleFailedRequestFunction({ error, request, body }) {
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
      const postfix = type === ActorType.BlackFriday ? "_bf" : "";
      const tableName = `aaaauto_${country.toLocaleLowerCase()}${postfix}`;
      await uploadToKeboola(tableName);
    } catch (err) {
      console.log(err);
    }
  }

  console.log("Finished.");
}

await Actor.main(main);
