const Apify = require("apify");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const { log } = Apify.utils;

const APPLE = "Apple";
const APPLE_REVIEWS = "Apple Reviews";
const FIREFOX = "Firefox";
const FIREFOX_REVIEWS = "Firefox Reviews";
const GOOGLE = "Google";
const GOOGLE_REVIEWS = "Google Reviews";

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

function appleReview($) {
  return function () {
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
  };
}

function appleReviews(request, $) {
  const $reviews = $(".we-customer-review");
  return $reviews.map(appleReview($)).toArray();
}

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

function googleReview($) {
  return function () {
    const $review = $(this);
    return {
      "@context": "https://schema.org",
      "@type": "Review",
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
  };
}

function googleReviews(request, $) {
  const $reviews = $("table.table tbody tr");
  return $reviews.map(googleReview($)).toArray();
}

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

function firefoxReview(result) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
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

async function firefoxReviews(request, json, requestQueue) {
  if (json.next) {
    await requestQueue.addRequest({
      url: json.next,
      userData: { label: FIREFOX_REVIEWS }
    });
  }
  return json.results.map(firefoxReview);
}

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

Apify.main(async () => {
  const input = await Apify.getInput();
  const { awsCredentials } = input ?? {};

  const requestList = await Apify.openRequestList("urls", [
    {
      url:
        "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs",
      userData: { label: APPLE }
    },
    {
      url:
        "https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?l=cs",
      userData: { label: APPLE_REVIEWS }
    },
    {
      url: "https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk",
      userData: { label: GOOGLE }
    },
    {
      url:
        "https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk/reviews",
      userData: { label: GOOGLE_REVIEWS }
    },
    {
      url:
        "https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/",
      userData: { label: FIREFOX }
    },
    {
      url: "https://addons.mozilla.org/api/v4/ratings/rating/?addon=1013407",
      userData: { label: FIREFOX_REVIEWS }
    }
  ]);
  const requestQueue = await Apify.openRequestQueue();

  const reviews = [];
  const stats = [];

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    },
    handlePageFunction: async ({ request, $, json }) => {
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
    }
  });

  log.info("CRAWLER: scraping reviews");
  await crawler.run();
  log.info("CRAWLER: done");

  log.info("S3: starting upload");
  const s3 = new S3Client({
    region: "eu-central-1",
    credentials: awsCredentials
  });
  await uploadToS3(s3, "reviews", "jsonld", reviews);
  await uploadToS3(s3, "stats", "jsonld", stats);
  log.info("S3: done");
});
