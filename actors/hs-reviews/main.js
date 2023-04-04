import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand
} from "@aws-sdk/client-cloudfront";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { parseHTML } from "linkedom/cached";
import * as csv from "csv-parse/sync";
import jwt from "jsonwebtoken";
import { URLSearchParams } from "url";
import { promisify } from "util";
import zlib from "zlib";

/** @typedef { import("@crawlee/http").RequestHandler } HandleRequest */
/** @typedef { import("schema-dts").UserReview } UserReview */
/** @typedef { import("schema-dts").InteractionCounter } InteractionCounter */

const gunzip = promisify(zlib.gunzip);

/**
 * @param {Document} document
 * @returns {InteractionCounter[]}
 */
function appleStats(document) {
  const reviews = parseInt(
    document
      .querySelector(".we-customer-ratings__count")
      .textContent.match(/\d+/g)
      .pop()
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
    .map(x => parseInt(x.Units))
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
 * @param {Element} review
 * @returns {UserReview}
 */
function appleReview(review) {
  return {
    "@context": "https://schema.org",
    "@type": "UserReview",
    "author": {
      "@type": "Person",
      "name": review
        .querySelector(".we-customer-review__user")
        .textContent.trim()
    },
    "datePublished": review.querySelector("time").getAttribute("datetime"),
    "reviewBody": review.querySelector("blockquote").textContent.trim(),
    "reviewRating": {
      "@type": "Rating",
      "bestRating": 5,
      "ratingValue": parseInt(
        review
          .querySelector(".we-customer-review__rating")
          .getAttribute("aria-label")[0],
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

/**
 * @param {Document} document
 * @returns {UserReview[]}
 */
function appleReviews(document) {
  return document.querySelectorAll(".we-customer-review").map(appleReview);
}

/**
 * @param {Document} document
 * @returns {InteractionCounter[]}
 */
function googleStats(document) {
  const downloads = parseInt(
    document
      .querySelector(".left-panel > div+div > .value")
      .textContent.replace(",", "")
  );
  const reviews = parseInt(
    document
      .querySelector(".left-panel > div+div+div > div:first-child > .value")
      .textContent.match(/\d+/g)
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
 * @param {Element} review
 * @returns {UserReview}
 */
function googleReview(review) {
  return {
    "@context": "https://schema.org",
    "@type": "UserReview",
    "author": {
      "@type": "Person",
      "name": review.querySelector(".reviewer-name").textContent,
      "image": review.querySelector("img[loading]")?.getAttribute("src")
    },
    "datePublished": review.querySelector("td:first-child").textContent,
    "reviewBody": review.querySelector(".review-body").textContent,
    "reviewRating": {
      "@type": "Rating",
      "bestRating": 5,
      "ratingValue": parseInt(
        review.querySelector("meta").getAttribute("content"),
        10
      ),
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

/**
 * @param {Document} document
 * @returns {UserReview[]}
 */
function googleReviews(document) {
  return document.querySelectorAll("table.table tbody tr").map(googleReview);
}

/**
 * @param {Document} document
 * @returns {InteractionCounter[]}
 */
function firefoxStats(document) {
  const meta = document.querySelectorAll(".MetadataCard > dl");
  if (!meta.length) return [];
  const downloads = parseInt(
    meta[0].querySelector("dd").textContent.replace(/\s/g, "").replace(",", ""),
    10
  );
  const reviews = parseInt(
    meta[1].querySelector("dd").textContent.replace(/\s/g, "").replace(",", ""),
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

/**
 * @param {Object} result
 * @returns {UserReview}
 */
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
 * @param {*} json
 * @returns {UserReview[]}
 */
function firefoxReviews(json) {
  return json.results.map(firefoxReview);
}

/**
 * @param {S3Client} s3
 * @param {string} fileName
 * @param {string} ext
 * @param {*} data
 */
async function uploadToS3(s3, fileName, ext, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: `app/${fileName}.${ext}`,
      ContentType: `application/${ext}`,
      Body: JSON.stringify(data)
    })
  );
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
  await Promise.all([
    uploadToS3(s3, "reviews", "jsonld", reviews),
    uploadToS3(s3, "stats", "jsonld", stats)
  ]);
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
 * @param {String} token
 */
function createRequestHandler(token) {
  /** @type {UserReview[]} */
  const reviews = [];
  /** @type {InteractionCounter[]} */
  const stats = [];
  /** @type {RequestHandler} */
  const requestHandler = async ({ crawler, request }) => {
    const { requestQueue } = crawler;
    log.info(`Handling page ${request.url}`);
    switch (request.userData.label) {
      case APPLE: {
        const response = await fetch(request.url);
        const { document } = parseHTML(await response.text());
        const result = appleStats(document);
        await Dataset.pushData(result);
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
        await Dataset.pushData(result);
        stats.push(...result);
        break;
      }
      case APPLE_REVIEWS: {
        const response = await fetch(request.url);
        const { document } = parseHTML(await response.text());
        const result = appleReviews(document);
        await Dataset.pushData(result);
        reviews.push(...result);
        break;
      }
      case GOOGLE: {
        const response = await fetch(request.url);
        const { document } = parseHTML(await response.text());
        const result = googleStats(document);
        await Dataset.pushData(result);
        stats.push(...result);
        break;
      }
      case GOOGLE_REVIEWS: {
        const response = await fetch(request.url);
        const { document } = parseHTML(await response.text());
        const result = googleReviews(document);
        await Dataset.pushData(result);
        reviews.push(...result);
        break;
      }
      case FIREFOX: {
        const response = await fetch(request.url);
        const { document } = parseHTML(await response.text());
        const result = firefoxStats(document);
        await Dataset.pushData(result);
        stats.push(...result);
        break;
      }
      case FIREFOX_REVIEWS: {
        const json = await fetch(request.url).then(r => r.json());
        if (json.next) {
          await requestQueue.addRequest({
            url: json.next,
            userData: { label: FIREFOX_REVIEWS }
          });
        }
        const result = firefoxReviews(json);
        await Dataset.pushData(result);
        reviews.push(...result);
        break;
      }
    }
  };

  return { reviews, stats, requestHandler };
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

async function main() {
  rollbar.init();

  const input = (await KeyValueStore.getInput()) ?? {};
  const { applePK } = input;
  const token = createAppleJWT(applePK);

  const { reviews, stats, requestHandler } = createRequestHandler(token);

  const crawler = new HttpCrawler({
    requestHandler,
    maxRequestRetries: 1,
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  log.info("CRAWLER: scraping reviews");
  await crawler.run(
    Array.from(requests.entries()).map(([label, url]) => ({
      url,
      userData: { label, year: 2019 }
    }))
  );
  log.info("CRAWLER: done");

  await saveData({
    reviews,
    stats
  });
}

await Actor.main(main);
