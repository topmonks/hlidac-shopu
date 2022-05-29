import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  LABELS,
  PRODUCTS_URLS,
  SCRIPT_WITH_JSON,
  PRODUCTS_PER_PAGE,
  PRODUCTS_BASE_URL
} from "./const.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import randomUA from "modern-random-ua";

const { log } = Apify.utils;

async function getProductJSON($) {
  let correctScript;
  const scripts = $("script").toArray();
  for (const s of scripts) {
    const data = s?.children[0]?.data;
    if (data?.startsWith(SCRIPT_WITH_JSON.PREFIX)) {
      correctScript = data;
    }
  }
  if (correctScript) {
    let resultJson = correctScript.replace(SCRIPT_WITH_JSON.PREFIX, "");
    resultJson = resultJson.replace(SCRIPT_WITH_JSON.POSTFIX, "");
    resultJson = resultJson.replaceAll(
      SCRIPT_WITH_JSON.UNDEFINED,
      `"${SCRIPT_WITH_JSON.UNDEFINED}"`
    );
    return resultJson;
  }
}

function getCategory(sections) {
  // create category from the first top down path from the tree
  let result = [];
  let prevParent = "initial";
  for (const section in sections) {
    const item = sections[section];
    if (prevParent === item.parentId || prevParent === "initial") {
      prevParent = item.id;
      result.push(item);
    }
  }
  return result.map(p => p.name.trim()).join(" > ");
}

async function scrapeListing({ context, stats, test }) {
  log.info("Processing START");
  const { crawler, request, $ } = context;
  const resultJson = await getProductJSON($);
  const json = JSON.parse(resultJson);
  const totalItems = json.products.listingData.totalItems;
  let totalPages = Math.floor(totalItems / PRODUCTS_PER_PAGE);
  if (test) {
    totalPages = 3;
    log.info(`TEST mode. Data are taken only from ${totalPages} pages.`);
  }
  log.info(`Pocet produktu:${totalItems}`);
  log.info(`Pocet stranek produktu:${totalPages}`);
  stats.urls += totalPages;
  for (let i = 1; i <= totalPages; i++) {
    await crawler.requestQueue.addRequest({
      url: `${request.url}?page=${i}`,
      userData: {
        label: LABELS.PRODUCTS
      }
    });
  }
}

async function scrapeProducts({ processedIds, stats, development, $, s3 }) {
  const resultJson = await getProductJSON($);
  const json = JSON.parse(resultJson);
  const products = json.products.listingData.items;

  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  stats.totalItems += products.length;
  for (const item of products) {
    const detailImage = item?.images[0]?.detail;
    const originalPrice = parseInt(item?.price?.baseWithVat?.decimal);
    const currentPrice = parseInt(item.price.withVat.decimal);
    const discounted = originalPrice !== currentPrice;
    const category = getCategory(item.sections);
    const result = {
      itemId: item.id.toString().trim(),
      itemCode: item.code,
      itemUrl: `${PRODUCTS_BASE_URL}${item.urlRelative}`,
      itemName: item.name,
      img: detailImage,
      discounted,
      originalPrice: discounted ? originalPrice : null,
      currency: item.price.withVat.currency,
      currentPrice,
      category,
      inStock: !!item.availability,
      blackFriday: item.blackFriday
    };
    // Save data to dataset
    if (!processedIds.has(result.itemId)) {
      processedIds.add(result.itemId);
      requests.push(
        !development ? uploadToS3v2(s3, result, { priceCurrency: "CZK" }) : [],
        Apify.pushData(result)
      );
      stats.items++;
    } else {
      stats.itemsDuplicity++;
    }
  }
  // await all requests, so we don't end before they end
  await Promise.all(requests);
}

Apify.main(async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const processedIds = new Set();
  const input = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    test = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input ?? {};
  const requestQueue = await Apify.openRequestQueue();
  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  if (type === ActorType.BF) {
    await requestQueue.addRequest({
      url: PRODUCTS_URLS.BF_PRODUCTS_PAGE,
      headers: {
        userAgent: randomUA.generate()
      },
      userData: {
        label: LABELS.START
      }
    });
  } else {
    for (const categoryUrl of PRODUCTS_URLS.PRODUCTS_PAGE) {
      await requestQueue.addRequest({
        url: categoryUrl,
        headers: {
          userAgent: randomUA.generate()
        },
        userData: {
          label: LABELS.START
        }
      });
    }
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    proxyConfiguration,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request, $ } = context;
      const { label } = request.userData;
      log.info(`Processing: [${label}] - [${request.url}]`);
      switch (label) {
        case LABELS.START:
          return scrapeListing({
            context,
            stats,
            test
          });
        case LABELS.PRODUCTS:
          return scrapeProducts({ processedIds, stats, $, s3 });
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats);
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "prozdravi.cz");
    log.info("invalidated Data CDN");

    let tableName = "prozdravi_cz";
    if (type === ActorType.BF) {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR finished");
});
