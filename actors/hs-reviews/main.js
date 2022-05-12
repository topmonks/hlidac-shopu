import Apify from "apify";
import { fetch } from "@adobe/helix-fetch";
import { S3Client } from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand
} from "@aws-sdk/client-cloudfront";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import cheerio from "cheerio";
import * as csv from "csv-parse/sync";
import jwt from "jsonwebtoken";
import { URLSearchParams } from "url";
import { promisify } from "util";
import zlib from "zlib";

/** @typedef { import("apify").RequestQueue } RequestQueue */
/** @typedef { import("apify").RequestList } RequestList */
/** @typedef { import("apify").HandleRequest } HandleRequest */
/** @typedef { import("schema-dts").UserReview} UserReview */
/** @typedef { import("schema-dts").InteractionCounter} InteractionCounter */

const gunzip = promisify(zlib.gunzip);
const { log, requestAsBrowser } = Apify.utils;

/**
 * @param {Request} request
 * @param {cheerio.Root} $
 * @returns {InteractionCounter[]}
 */
function appleStats(request, $) {
  const reviews = parseInt(
    $(".we-customer-ratings__count").text().match(/\d+/g).pop()
  );
  return [
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/ReviewAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Mac App Store",
        "url":
          "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs#?platform=mac"
      },
      "userInteractionCount": reviews,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    }
  ];
}

const pad = x => `00${x}`.slice(-2);

/**
 * @param {Request} request
 * @param {Response} resp
 * @param {RequestQueue} requestQueue
 * @returns {InteractionCounter[]}
 */
async function appleDownloads(request, resp, requestQueue) {
  const year = request.userData.year + 1;
  const thisYear = new Date().getFullYear();
  const month = request.userData.month ?? 0;
  const thisMonth = new Date().getMonth();
  if (year < thisYear) {
    await requestQueue.addRequest({
      url: appleDownloadsUrl(year),
      userData: { ...request.userData, year }
    });
  } else if (month < thisMonth) {
    await requestQueue.addRequest({
      url: appleDownloadsUrl(`${thisYear}-${pad(month + 1)}`, "MONTHLY"),
      userData: { ...request.userData, thisYear, month: month + 1 }
    });
  }
  if (resp.headers.get("content-type") !== "application/a-gzip") {
    console.warn(await resp.text());
    return;
  }
  const data = await resp
    .arrayBuffer()
    .then(gunzip)
    .then(x => csv.parse(x.toString(), { delimiter: "\t", columns: true }));
  const downloads = data
    .filter(x => x["Apple Identifier"] === "1488295734")
    .map(x => parseInt(x["Units"]))
    .reduce((acc, x) => acc + x, 0);
  return [
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/InstallAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Apple App Store",
        "url":
          "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs#?platform=mac"
      },
      "disambiguatingDescription": request.userData.year.toString(),
      "userInteractionCount": downloads,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    }
  ];
}

/**
 * @param {cheerio.Root} $
 */
function appleReview($) {
  return factory;

  /** @returns {UserReview} */
  function factory() {
    const $review = $(this);
    return {
      "@context": "https://schema.org",
      "@type": "UserReview",
      "author": {
        "@type": "Person",
        "name": $review.find(".we-customer-review__user").text().trim()
      },
      "datePublished": $review.find("time").attr("datetime"),
      "reviewBody": $review.find("blockquote").text().trim(),
      "reviewRating": {
        "@type": "Rating",
        "bestRating": 5,
        "ratingValue": parseInt(
          $review.find(".we-customer-review__rating").attr("aria-label")[0],
          10
        ),
        "worstRating": 1
      },
      "url":
        "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs#?platform=mac",
      "itemReviewed": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    };
  }
}

/**
 * @param {Request} request
 * @param {cheerio.Root} $
 * @returns {UserReview[]}
 */
function appleReviews(request, $) {
  const $reviews = $(".we-customer-review");
  return $reviews.map(appleReview($)).toArray();
}

/**
 * @param {Request} request
 * @param {cheerio.Root} $
 * @returns {InteractionCounter[]}
 */
function googleStats(request, $) {
  const downloads = parseInt(
    $(".left-panel > div:nth-child(2) > div:nth-child(2) > .value")
      .text()
      .replace(",", "")
  );
  const reviews = parseInt(
    $(".left-panel > div:nth-child(2) > div:nth-child(1) > .value")
      .text()
      .match(/\d+/g)
      .pop()
  );
  return [
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/InstallAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Chrome Web Store",
        "url":
          "https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
      },
      "userInteractionCount": downloads,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/ReviewAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Chrome Web Store",
        "url":
          "https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
      },
      "userInteractionCount": reviews,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    }
  ];
}

/**
 * @param {cheerio.Root} $
 */
function googleReview($) {
  return factory;

  /** @returns {UserReview} */
  function factory() {
    const $review = $(this);
    return {
      "@context": "https://schema.org",
      "@type": "UserReview",
      "author": {
        "@type": "Person",
        "name": $review.find("[itemprop=author] [itemprop=name]").text(),
        "image": $review.find("[itemprop=author] img").attr("src")
      },
      "datePublished": $review.find("[itemprop=datePublished]").text(),
      "reviewBody": $review.find("[itemprop=reviewBody]").text(),
      "reviewRating": {
        "@type": "Rating",
        "bestRating": 5,
        "ratingValue": $review.find("[itemprop=reviewRating]").attr("content"),
        "worstRating": 1
      },
      "url":
        "https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk",
      "itemReviewed": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    };
  }
}

/**
 * @param {Request} request
 * @param {cheerio.Root} $
 * @returns {UserReview[]}
 */
function googleReviews(request, $) {
  const $reviews = $("table.table tbody tr");
  return $reviews.map(googleReview($)).toArray();
}

/**
 * @param {Request} request
 * @param {cheerio.Root} $
 * @returns {InteractionCounter[]}
 */
function firefoxStats(request, $) {
  const meta = $(".MetadataCard > dl");
  if (!meta.length) return [];
  const downloads = parseInt(
    $(meta[0]).find("dd").text().replace(/\s/g, "").replace(",", ""),
    10
  );
  const reviews = parseInt(
    $(meta[1]).find("dd").text().replace(/\s/g, "").replace(",", ""),
    10
  );
  return [
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/InstallAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Firefox Browser Add-ons",
        "url":
          "https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/"
      },
      "userInteractionCount": downloads,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "InteractionCounter",
      "interactionType": "https:/schema.org/ReviewAction",
      "interactionService": {
        "@type": "WebSite",
        "name": "Firefox Browser Add-ons",
        "url":
          "https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/"
      },
      "userInteractionCount": reviews,
      "subjectOf": {
        "@type": "WebApplication",
        "url": "https://www.hlidacshopu.cz/"
      }
    }
  ];
}

/** @returns {UserReview} */
function firefoxReview(result) {
  return {
    "@context": "https://schema.org",
    "@type": "UserReview",
    "@id": result.id,
    "author": {
      "@type": "Person",
      "@id": result.user.id,
      "name": result.user.name,
      "url": result.user.url
    },
    "datePublished": result.created,
    "reviewBody": result.body,
    "reviewRating": {
      "@type": "Rating",
      "bestRating": 5,
      "ratingValue": result.score,
      "worstRating": 1
    },
    "url":
      "https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/reviews/",
    "itemReviewed": {
      "@type": "WebApplication",
      "url": "https://www.hlidacshopu.cz/"
    }
  };
}

/**
 * @param {Request} request
 * @param {*} json
 * @param {RequestQueue} requestQueue
 * @returns {UserReview[]}
 */
async function firefoxReviews(request, json, requestQueue) {
  if (json.next) {
    await requestQueue.addRequest({
      url: json.next,
      userData: { label: FIREFOX_REVIEWS }
    });
  }
  return json.results.map(firefoxReview);
}

/**
 *
 * @param {CloudFrontClient} cloudfront
 * @param {string} distributionId
 * @returns {Promise<void>}
 */
async function invalidateCDN(cloudfront, distributionId) {
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: { Items: ["/app/*"], Quantity: 1 },
        CallerReference: new Date().getTime().toString()
      }
    })
  );
}

async function saveData({ reviews, stats }) {
  const configuration = { region: "eu-central-1", maxAttempts: 3 };

  log.info("S3: starting upload of data");
  const s3 = new S3Client(configuration);
  await uploadToS3v2(s3, reviews);
  await uploadToS3v2(s3, stats);
  log.info("S3: done");

  log.info("CloudFront: invalidating data in CDN");
  const cloudfront = new CloudFrontClient(configuration);
  await invalidateCDN(cloudfront, "EQYSHWUECAQC9");
  log.info("CloudFront: done");
}

const APPLE = "Apple";
const APPLE_REVIEWS = "Apple Reviews";
const APPLE_DOWNLOADS = "Apple Downloads";
const FIREFOX = "Firefox";
const FIREFOX_REVIEWS = "Firefox Reviews";
const GOOGLE = "Google";
const GOOGLE_REVIEWS = "Google Reviews";

function appleDownloadsUrl(date, freq = "YEARLY") {
  return `https://api.appstoreconnect.apple.com/v1/salesReports?${new URLSearchParams(
    {
      "filter[frequency]": freq,
      "filter[reportDate]": date.toString(),
      "filter[reportSubType]": "SUMMARY",
      "filter[reportType]": "SALES",
      "filter[vendorNumber]": "85389739"
    }
  )}`;
}

const requests = new Map([
  [
    APPLE,
    "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs"
  ],
  [
    APPLE_REVIEWS,
    "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs"
  ],
  [APPLE_DOWNLOADS, appleDownloadsUrl(2019)],
  [GOOGLE, "https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk"],
  [
    GOOGLE_REVIEWS,
    "https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk/reviews"
  ],
  [
    FIREFOX,
    "https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/"
  ],
  [
    FIREFOX_REVIEWS,
    "https://addons.mozilla.org/api/v4/ratings/rating/?addon=1013407"
  ]
]);

/**
 * @param {RequestQueue} requestQueue
 * @param {String} token
 */
function createHandlePageFunction(requestQueue, token) {
  /** @type {UserReview[]} */
  const reviews = [];
  /** @type {InteractionCounter[]} */
  const stats = [];
  /** @type {HandleRequest} */
  const handlePageFunction = async ({ request }) => {
    log.info(`Handling page ${request.url}`);
    switch (request.userData.label) {
      case APPLE: {
        const response = await requestAsBrowser({ url: request.url });
        const $ = cheerio.load(response.body);
        const result = appleStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case APPLE_DOWNLOADS: {
        const resp = await fetch(request.url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/a-gzip"
          }
        });
        const result = await appleDownloads(request, resp, requestQueue);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case APPLE_REVIEWS: {
        const response = await requestAsBrowser({ url: request.url });
        const $ = cheerio.load(response.body);
        const result = appleReviews(request, $);
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
      case GOOGLE: {
        const response = await requestAsBrowser({ url: request.url });
        const $ = cheerio.load(response.body);
        const result = googleStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case GOOGLE_REVIEWS: {
        const response = await requestAsBrowser({ url: request.url });
        const $ = cheerio.load(response.body);
        const result = googleReviews(request, $);
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
      case FIREFOX: {
        const response = await requestAsBrowser({ url: request.url });
        const $ = cheerio.load(response.body);
        const result = firefoxStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case FIREFOX_REVIEWS: {
        const response = await requestAsBrowser({ url: request.url });
        const result = await firefoxReviews(
          request,
          JSON.parse(response.body),
          requestQueue
        );
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
    }
  };

  return { reviews, stats, handlePageFunction };
}

/**
 * Creates JWT for Apple API request authorization
 * @param {String} applePK
 * @returns {String}
 */
function createAppleJWT(applePK) {
  return jwt.sign({}, applePK, {
    "algorithm": "ES256",
    "issuer": "69a6de74-fd57-47e3-e053-5b8c7c11a4d1",
    "expiresIn": 1000,
    "audience": "appstoreconnect-v1",
    header: {
      "alg": "ES256",
      "kid": "JHF22PT4Z8",
      "typ": "JWT"
    }
  });
}

Apify.main(async function main() {
  rollbar.init();

  const input = await Apify.getInput();
  const { applePK } = input ?? {};
  const token = createAppleJWT(applePK);

  /** @type {RequestList} */
  const requestList = await Apify.openRequestList(
    "urls",
    Array.from(requests.entries()).map(([label, url]) => ({
      url,
      userData: { label, year: 2019 }
    }))
  );
  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  const { reviews, stats, handlePageFunction } = createHandlePageFunction(
    requestQueue,
    token
  );

  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    handleRequestFunction: handlePageFunction,
    maxRequestRetries: 1,
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("CRAWLER: scraping reviews");
  await crawler.run();
  log.info("CRAWLER: done");

  await saveData({
    reviews,
    stats
  });
});
