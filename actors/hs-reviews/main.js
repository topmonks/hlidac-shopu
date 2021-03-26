const Apify = require("apify");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/** @typedef { import("apify").RequestQueue } RequestQueue */
/** @typedef { import("apify").RequestList } RequestList */
/** @typedef { import("apify").CheerioHandlePage } CheerioHandlePage */
/** @typedef { import("schema-dts").UserReview} UserReview */
/** @typedef { import("schema-dts").InteractionCounter} InteractionCounter */

const { log } = Apify.utils;

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

async function saveData({ awsCredentials, reviews, stats }) {
  log.info("S3: starting upload");
  const s3 = new S3Client({
    region: "eu-central-1",
    credentials: awsCredentials
  });
  await uploadToS3(s3, "reviews", "jsonld", reviews);
  await uploadToS3(s3, "stats", "jsonld", stats);
  log.info("S3: done");
}

const APPLE = "Apple";
const APPLE_REVIEWS = "Apple Reviews";
const FIREFOX = "Firefox";
const FIREFOX_REVIEWS = "Firefox Reviews";
const GOOGLE = "Google";
const GOOGLE_REVIEWS = "Google Reviews";

const requests = new Map([
  [
    APPLE,
    "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs"
  ],
  [
    APPLE_REVIEWS,
    "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs"
  ],
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
 */
function createHandlePageFunction(requestQueue) {
  /** @type {UserReview[]} */
  const reviews = [];
  /** @type {InteractionCounter[]} */
  const stats = [];
  /** @type {CheerioHandlePage} */
  const handlePageFunction = async ({ request, $, json }) => {
    log.info(`Handling page ${request.url}`);
    switch (request.userData.label) {
      case APPLE: {
        const result = appleStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case APPLE_REVIEWS: {
        const result = appleReviews(request, $);
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
      case GOOGLE: {
        const result = googleStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case GOOGLE_REVIEWS: {
        const result = googleReviews(request, $);
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
      case FIREFOX: {
        const result = firefoxStats(request, $);
        await Apify.pushData(result);
        stats.push(...result);
        break;
      }
      case FIREFOX_REVIEWS: {
        const result = await firefoxReviews(request, json, requestQueue);
        await Apify.pushData(result);
        reviews.push(...result);
        break;
      }
    }
  };

  return { reviews, stats, handlePageFunction };
}

Apify.main(async () => {
  const input = await Apify.getInput();
  const { awsCredentials } = input ?? {};

  /** @type {RequestList} */
  const requestList = await Apify.openRequestList(
    "urls",
    Array.from(requests.entries()).map(([label, url]) => ({
      url,
      userData: { label }
    }))
  );
  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  const { reviews, stats, handlePageFunction } = createHandlePageFunction(
    requestQueue
  );

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    handlePageFunction,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  log.info("CRAWLER: scraping reviews");
  await crawler.run();
  log.info("CRAWLER: done");

  await saveData({
    awsCredentials,
    reviews,
    stats
  });
});
