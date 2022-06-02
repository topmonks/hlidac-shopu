import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN,
  currencyToISO4217
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { URL, URLSearchParams } from "url";
import { gotScraping } from "got-scraping";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";
import { DOMParser, parseHTML } from "linkedom";

const { log } = Apify.utils;

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY"
};

function makeListingUrl() {
  throw new Error("Not implemented");
}

function parseItem(p, country, category) {
  throw new Error("Not implemented");
  // return {
  //   itemId:
  //   itemName:
  //   itemUrl:
  //   img:
  //   inStock:
  //   currentPrice:
  //   originalPrice:
  //   currency:
  //   category,
  //   discounted:
  // };
}

async function handleProducts() {
  throw new Error("Not implemented");
}

async function handleCategory(body, requestQueue, country, category) {
  throw new Error("Not implemented");
}

async function handleStart(type, stats, requestQueue, country) {
  log.info("Pagination info", type);
  const topCategoryHeadlines = document.querySelectorAll(
    `[data-testid="product-category"] h2`
  );

  for (const headline of topCategoryHeadlines) {
    const title = headline.innerText;
    const href = headline.querySelector("a").getAttribute("href");
    const link = new URL(href, `https://www.hornbach.cz/`);

    log.debug(`Found category ${title} at link: ${link}`);
    // stats.inc("categories");
    // we need to await here to prevent higher categories
    // to be enqueued sooner than sub-categories
    //   await requestQueue.addRequest({
    //     url: `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
    //       country
    //     )}${category.link}/?json`,
    //     userData: {
    //       country,
    //       category: category.breadcrumbs.toString(),
    //       label: LABELS.CATEGORY
    //     }
    //   });
  }
}

async function enqueInitialRequest(type, requestQueue, country) {
  await requestQueue.addRequest({
    url: `https://www.hornbach.${country.toLowerCase()}/c`,
    userData: {
      country,
      label: LABELS.START
    }
  });
}

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });
  const processedIds = new Set();
  const detailUrl = defAtom(null);

  const input = await Apify.getInput();
  const {
    debug = false,
    country = COUNTRY.CZ,
    type = ActorType.FULL
  } = input ?? {};

  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  await enqueInitialRequest(type, requestQueue, country);

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 1,
    async handleRequestFunction(context) {},
    async handleFailureFunction(context) {}
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.allSettled([
    stats.save(),
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(detailUrl.deref())),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);

  log.info("invalidated Data CDN");
  log.info("Finished.");
});
