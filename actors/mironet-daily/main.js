import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { fetch } from "@adobe/helix-fetch";
import { DOMParser } from "linkedom";
import Apify from "apify";
import zlib from "zlib";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const { log } = Apify.utils;
const processedIds = new Set();

const WEB = "https://www.mironet.cz";

async function getAllCategories() {
  const resp = await fetch(
    "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz"
  );
  const buffer = await resp.buffer();
  const markup = zlib.unzipSync(buffer).toString();
  const document = new DOMParser().parseFromString(markup, "text/xml");
  return Array.from(document.getElementsByTagNameNS("", "url"))
    .flatMap(x => Array.from(x.getElementsByTagNameNS("", "loc")))
    .map(x => x.textContent.trim())
    .map(url => ({
      url,
      userData: {
        label: "page",
        baseUrl: url
      }
    }));
}

async function createRequestList({ type, bfUrl }) {
  switch (type) {
    case ActorType.BF:
      return Apify.openRequestList("black-friday", [
        {
          url: bfUrl,
          userData: {
            label: "category_vyprodej"
          }
        }
      ]);
    case ActorType.TEST:
      return Apify.openRequestList("test", [
        {
          url: "https://www.mironet.cz/graficke-karty+c14402/",
          userData: {
            label: "page",
            baseUrl: "https://www.mironet.cz/graficke-karty+c14402/"
          }
        }
      ]);
    case ActorType.FULL:
      const categories = await getAllCategories();
      return Apify.openRequestList("sitemap", categories);
    default:
      throw new Error("Unknown actor type: " + type);
  }
}

async function handleSelout($, requestQueue, stats) {
  const categories = [];
  let onclickUrl;
  $(".vyprodej_category_head").each(function () {
    const moreBox = $(this).find(".bpMoreBox");
    if (moreBox.length) {
      moreBox.find("a").each(function () {
        categories.push({
          url: `${WEB}${$(this).attr("href")}`,
          userData: {
            label: "category"
          }
        });
      });
    } else {
      const onClick = $(this).attr("onclick");
      onclickUrl = onClick.replace("location.href=", "").replace(/'/g, "");
    }
  });
  if (categories.length) {
    for (const category of categories) {
      await requestQueue.addRequest(category);
      stats.inc("urls");
    }
  } else if (onclickUrl) {
    await requestQueue.addRequest({
      url: new URL(onclickUrl, WEB).href,
      userData: {
        label: "category"
      }
    });
    stats.inc("urls");
  }
}

async function handleCategory($, stats, request, requestQueue) {
  const browseSubCategories = $("div#BrowseSubCategories > a")
    .map(function () {
      return $(this).attr("href");
    })
    .toArray();
  if (browseSubCategories.length) {
    for (const categoryUrl of browseSubCategories) {
      const url = new URL(categoryUrl, WEB).href;
      await requestQueue.addRequest({
        url: url,
        userData: {
          label: "page",
          baseUrl: url
        }
      });
      stats.inc("urls");
    }
  } else {
    log.debug(`Enqueue ${request.url} as a page`);
    await requestQueue.addRequest({
      url: request.url,
      userData: {
        label: "page",
        baseUrl: request.url
      }
    });
    stats.inc("urls");
  }
}

async function handlePage($, stats, request, requestQueue) {
  let pageNum = 0;
  $("a.PageNew").each(function () {
    pageNum =
      pageNum < parseInt($(this).text().trim())
        ? parseInt($(this).text().trim())
        : pageNum;
  });
  if (pageNum > 0) {
    stats.add("pages", pageNum);
    log.debug(`Found ${pageNum} pages on ${request.url}`);
    const { baseUrl } = request.userData;
    const url = baseUrl.includes("?") ? `${baseUrl}&PgID=` : `${baseUrl}?PgID=`;
    for (let i = 2; i <= pageNum; i++) {
      await requestQueue.addRequest(
        new Apify.Request({
          userData: {
            label: "pages",
            baseUrl: request.userData.baseUrl
          },
          url: `${url}${i}`
        })
      );
    }
  }
}

Apify.main(async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrl = "https://www.mironet.cz/vyprodej/?v=blue-friday"
  } = input ?? {};
  const shop = shopName(WEB);

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  // Open request queue and add statrUrl
  const requestQueue = await Apify.openRequestQueue();
  const requestList = await createRequestList({ type, bfUrl });

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  // Create crawler
  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    // Activates the Session pool.
    useSessionPool: true,
    // Overrides default Session pool configuration.
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    // Handle page context
    async handlePageFunction({ $, request, session, response }) {
      if (response.statusCode !== 200 && response.statusCode !== 404) {
        log.debug(
          `${request.url} -> Bad response code: ${response.statusCode}`
        );
        session.retire();
        stats.inc("failed");
      }

      if (request.userData.label === "category_vyprodej") {
        await handleSelout($, requestQueue, stats);
      } else if (request.userData.label === "category") {
        await handleCategory($, stats, request, requestQueue);
      }
      // This is the category page
      else if (
        request.userData.label === "page" ||
        request.userData.label === "pages"
      ) {
        try {
          if (request.userData.label === "page") {
            await handlePage($, stats, request, requestQueue);
          }
          const breadCrumbs = [];
          $("div#displaypath > a.CatParent").each(function () {
            breadCrumbs.push($(this).text().trim());
          });
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          const rawItems = $(".item_b").toArray();
          for (const item of rawItems) {
            const toNumber = p =>
              parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);

            const idElem = $(item).find(".item_kod");
            const linkElem = $(item).find(".nazev a");
            const priceElem = $(item).find(".item_cena");
            const imgElem = $(item).find(".item_obr img");
            const oPriceElem = $(item).find(".item_s_cena span");
            const img =
              imgElem.length !== 0 ? `https:${imgElem.attr("src")}` : null;
            const link = linkElem.length !== 0 ? linkElem.attr("href") : null;
            const id =
              idElem.length !== 0
                ? idElem.text().trim().replace("Kód: ", "")
                : null;
            const name = linkElem.length !== 0 ? linkElem.text().trim() : null;
            const price =
              priceElem.length !== 0 ? priceElem.text().trim() : false;
            const dataItem = {
              img,
              itemId: id,
              itemUrl: `${WEB}${link}`,
              itemName: name,
              discounted: !!oPriceElem,
              currentPrice: price ? toNumber(price) : null,
              breadCrumbs
            };
            if (oPriceElem.length !== 0) {
              const oPrice = oPriceElem.text().trim();
              dataItem.originalPrice = toNumber(oPrice);
            }
            // Save data to dataset
            if (!processedIds.has(dataItem.itemId)) {
              processedIds.add(dataItem.itemId);
              const slug = itemSlug(dataItem.itemUrl);
              requests.push(
                Apify.pushData({
                  ...dataItem,
                  shop,
                  slug
                }),
                uploadToS3v2(s3, dataItem, {
                  priceCurrency: "CZK",
                  category: dataItem.breadCrumbs.join(" > "),
                  inStock: true
                })
              );
            } else {
              stats.inc("itemsDuplicity");
            }
          }
          stats.add("items", requests.length);
          log.debug(
            `Found ${requests.length} items, storing them. ${request.url}`
          );
          // await all requests, so we don't end before they end
          await Promise.all(requests);
        } catch (e) {
          stats.inc("failed");
          log.error(e);
          console.log(`Failed extraction of items. ${request.url}`);
          console.error(e);
        }
      }
    },
    // If request failed 4 times then this function is executed
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed 4 times`);
    }
  });

  log.info("ACTOR - run crawler");
  // Run crawler
  await crawler.run();

  log.info("ACTOR - crawler end");
  await stats.save();

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "mironet.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola(type !== ActorType.FULL ? "mironet_bf" : "mironet");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
});
