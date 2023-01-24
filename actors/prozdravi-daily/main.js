import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  saveProducts
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, log, LogLevel } from "apify";
import { HttpCrawler, useState } from "@crawlee/http";
import { parseHTML } from "linkedom/cached";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
export const Labels = {
  START: "START",
  PRODUCTS: "PRODUCTS"
};

export const SCRIPT_WITH_JSON = {
  PREFIX: "window.__INITIAL_STATE__=",
  POSTFIX:
    ";(function(){var s;(s=document.currentScript||document.scripts[document.scripts.length-1]).parentNode.removeChild(s);}());",
  UNDEFINED: "undefined"
};

export const PRODUCTS_PER_PAGE = 56;
export const PRODUCTS_BASE_URL = "https://www.prozdravi.cz";
export const PRODUCTS_URLS = {
  PRODUCTS_PAGE: [
    "https://www.prozdravi.cz/casti-tela/",
    "https://www.prozdravi.cz/eko-domacnost/",
    "https://www.prozdravi.cz/ekologicka-pece-o-telo/",
    "https://www.prozdravi.cz/ekologicka-ustni-hygiena/",
    "https://www.prozdravi.cz/maminka-a-dite/",
    "https://www.prozdravi.cz/prirodni-kosmetika/",
    "https://www.prozdravi.cz/pristroje-a-pomucky/",
    "https://www.prozdravi.cz/problematiky/",
    "https://www.prozdravi.cz/zdrava-vyziva/"
  ],
  BF_PRODUCTS_PAGE: "https://www.prozdravi.cz/green-friday-produkty/",
  ITEM_PREFIX: "https://www.prozdravi.cz"
};

/**
 * @param {Document} document
 */
function getProductJSON(document) {
  let correctScript;
  const scripts = document.querySelectorAll("script");
  for (const s of scripts) {
    if (s.innerHTML.trim().startsWith(SCRIPT_WITH_JSON.PREFIX)) {
      correctScript = s.innerHTML;
    }
  }
  if (!correctScript) return;
  let resultJson = correctScript.replace(SCRIPT_WITH_JSON.PREFIX, "");
  resultJson = resultJson.replace(SCRIPT_WITH_JSON.POSTFIX, "");
  resultJson = resultJson.replaceAll(
    SCRIPT_WITH_JSON.UNDEFINED,
    `"${SCRIPT_WITH_JSON.UNDEFINED}"`
  );
  return resultJson;
}

function getCategory(sections) {
  // create category from the first top down path from the tree
  const result = [];
  let prevParent = "initial";
  for (const section in sections) {
    const item = sections[section];
    if (prevParent === item.parentId || prevParent === "initial") {
      prevParent = item.id;
      result.push(item.name.trim());
    }
  }
  return result.join(" > ");
}

function scrapeListing({ request, document }) {
  const requests = [];
  log.info("Processing START");
  const resultJson = getProductJSON(document);
  const json = JSON.parse(resultJson);
  const totalItems = json.products.listingData.totalItems;
  const totalPages = Math.floor(totalItems / PRODUCTS_PER_PAGE);
  log.info(`Pocet produktu:${totalItems}`);
  log.info(`Pocet stranek produktu:${totalPages}`);
  for (let i = 1; i <= totalPages; i++) {
    requests.push({
      url: `${request.url}?page=${i}`,
      userData: {
        label: Labels.PRODUCTS
      }
    });
  }
  return requests;
}

/**
 * @param {Document} document
 */
function scrapeProducts(document) {
  const resultJson = getProductJSON(document);
  const json = JSON.parse(resultJson);
  const products = json.products.listingData.items;

  return products.map(item => {
    const detailImage = item?.images[0]?.detail;
    const originalPrice = parseInt(item?.price?.baseWithVat?.decimal);
    const currentPrice = parseInt(item.price.withVat.decimal);
    const discounted = originalPrice !== currentPrice;
    const category = getCategory(item.sections);
    return {
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
  });
}

async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const processedIds = await useState("processedIds", new Set());

  const {
    development,
    debug,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    async requestHandler({ request, body, crawler }) {
      const { document } = parseHTML(body.toString());
      const { label } = request.userData;
      log.info(`Processing: [${label}] - [${request.url}]`);
      switch (label) {
        case Labels.START:
          const requests = scrapeListing({ request, document });
          stats.add("urls", requests.length);
          await crawler.requestQueue.addRequests(requests);
          crawler;
          break;
        case Labels.PRODUCTS:
          const products = scrapeProducts(document);
          await saveProducts({ s3, products, stats, processedIds });
          break;
      }
    },
    async failedRequestHandler({ request }) {
      log.error(`Request ${request.url} failed multiple times`);
      stats.inc("failed");
    }
  });

  const startingRequests = [];
  if (type === ActorType.BlackFriday) {
    startingRequests.push({
      url: PRODUCTS_URLS.BF_PRODUCTS_PAGE,
      userData: {
        label: Labels.START
      }
    });
  } else {
    for (const categoryUrl of PRODUCTS_URLS.PRODUCTS_PAGE) {
      startingRequests.push({
        url: categoryUrl,
        userData: {
          label: Labels.START
        }
      });
    }
  }
  await crawler.run(startingRequests);

  log.info("Crawl finished.");

  if (!development) {
    const cloudfront = new CloudFrontClient({
      region: "eu-central-1",
      maxAttempts: 3
    });
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "prozdravi.cz");
    log.info("invalidated Data CDN");

    let tableName = "prozdravi_cz";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main, { statusMessage: "Finished." });
