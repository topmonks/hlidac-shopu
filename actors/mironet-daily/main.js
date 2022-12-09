import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { fetch } from "@adobe/helix-fetch";
import { DOMParser, parseHTML } from "linkedom";
import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import zlib from "zlib";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler } from "@crawlee/http";

const WEB = "https://www.mironet.cz";

async function getAllCategories() {
  log.info("Loading Sitemap");
  const resp = await fetch(
    "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz"
  );
  const buffer = await resp.buffer();
  const markup = zlib.unzipSync(buffer).toString();
  const document = new DOMParser().parseFromString(markup, "text/xml");
  return Array.from(document.getElementsByTagNameNS("", "url"))
    .flatMap(x => Array.from(x.getElementsByTagNameNS("", "loc")))
    .map(x => {
      const url = x.textContent.trim();
      return {
        url,
        userData: {
          label: "page",
          baseUrl: url
        }
      };
    });
}

/**
 * @param {ActorType} type
 * @param {string} bfUrl
 * @returns {Promise<RequestList>}
 */
async function createRequestList({ type, bfUrl }) {
  switch (type) {
    case ActorType.BF:
      return [
        {
          url: bfUrl,
          userData: {
            label: "category_vyprodej"
          }
        }
      ];
    case ActorType.TEST:
      return [
        {
          url: "https://www.mironet.cz/graficke-karty+c14402/",
          userData: {
            label: "page",
            baseUrl: "https://www.mironet.cz/graficke-karty+c14402/"
          }
        }
      ];
    case ActorType.FULL:
      return await getAllCategories();
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

async function handleSale(document, enqueueLinks, stats) {
  const categoriesUrls = [];
  let onclickUrl;
  document.querySelectorAll(".vyprodej_category_head").map(category => {
    const moreBox = category.querySelector(".bpMoreBox");
    if (moreBox) {
      moreBox.querySelectorAll("a").map(a => {
        categoriesUrls.push(`${WEB}${a.getAttribute("href")}`);
      });
    } else {
      const onClick = category.getAttribute("onclick");
      onclickUrl = onClick.replace("location.href=", "").replace(/'/g, "");
    }
  });
  if (categoriesUrls.length) {
    await enqueueLinks(
      Object.assign({
        urls: categoriesUrls,
        userData: {
          label: "category"
        }
      })
    );
    stats.add("urls", categoriesUrls.length);
  } else if (onclickUrl) {
    await enqueueLinks({
      urls: [new URL(onclickUrl, WEB).href],
      userData: {
        label: "category"
      }
    });
    stats.inc("urls");
  }
}

async function handleCategory(document, stats, request, enqueueLinks) {
  const browseSubCategories = document
    .querySelectorAll("div#BrowseSubCategories > a")
    .map(a => a.getAttribute("href"));
  if (browseSubCategories.length) {
    for (const categoryUrl of browseSubCategories) {
      const url = new URL(categoryUrl, WEB).href;
      await enqueueLinks({
        urls: [url],
        userData: {
          label: "page",
          baseUrl: url
        }
      });
      stats.inc("urls");
    }
  } else {
    log.debug(`Enqueue ${request.url} as a page`);
    await enqueueLinks({
      urls: [request.url],
      userData: {
        label: "page",
        baseUrl: request.url
      }
    });
    stats.inc("urls");
  }
}

async function handlePage(document, stats, request, enqueueLinks) {
  const pageNum = document.querySelectorAll("a.PageNew").reduce((max, a) => {
    const pageNumber = parseInt(a.innerText.trim());
    return pageNumber > max ? pageNumber : max;
  }, 0);
  if (pageNum > 0) {
    stats.add("pages", pageNum);
    log.debug(`Found ${pageNum} pages on ${request.url}`);
    const { baseUrl } = request.userData;
    const url = baseUrl.includes("?") ? `${baseUrl}&PgID=` : `${baseUrl}?PgID=`;
    for (let i = 2; i <= pageNum; i++) {
      await enqueueLinks({
        userData: {
          label: "pages",
          baseUrl: request.userData.baseUrl
        },
        urls: [`${url}${i}`]
      });
    }
  }
}

async function main() {
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

  const input = await KeyValueStore.getInput();
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
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const processedIds = new Set();

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    async requestHandler({ body, request, enqueueLinks }) {
      log.info(`Processing ${request.url}`);
      const { document } = parseHTML(body.toString());
      const { label } = request.userData;
      const isCategoryPage = label === "page" || label === "pages";
      if (label === "category_vyprodej") {
        await handleSale(document, enqueueLinks, stats);
      } else if (label === "category") {
        await handleCategory(document, stats, request, enqueueLinks);
      } else if (isCategoryPage) {
        try {
          if (label === "page") {
            await handlePage(document, stats, request, enqueueLinks);
          }
          const breadCrumbs = document
            .querySelectorAll("div#displaypath > a.CatParent")
            .map(cat => cat.innerText.trim());
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          for (const item of document.querySelectorAll(".item_b")) {
            const toNumber = p =>
              parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);

            const idElem = item.querySelector(".item_kod");
            const linkElem = item.querySelector(".nazev a");
            const priceElem = item.querySelector(".item_cena");
            const imgElem = item.querySelector(".item_obr img");
            const oPriceElem = item.querySelector(".item_s_cena span");
            const img = imgElem ? `https:${imgElem.getAttribute("src")}` : null;
            const link = linkElem ? linkElem.getAttribute("href") : null;
            const id = idElem
              ? idElem.innerText.trim().replace("Kód: ", "")
              : null;
            const name = linkElem ? linkElem.innerText.trim() : null;
            const price = priceElem ? priceElem.innerText.trim() : false;
            const dataItem = {
              img,
              itemId: id,
              itemUrl: `${WEB}${link}`,
              itemName: name,
              discounted: !!oPriceElem,
              currentPrice: price ? toNumber(price) : null,
              breadCrumbs
            };
            if (oPriceElem) {
              const oPrice = oPriceElem.innerText.trim();
              dataItem.originalPrice = toNumber(oPrice);
            }
            // Save data to dataset
            if (!processedIds.has(dataItem.itemId)) {
              processedIds.add(dataItem.itemId);
              const slug = itemSlug(dataItem.itemUrl);
              requests.push(
                Dataset.pushData({
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
          await Promise.all(requests);
        } catch (e) {
          stats.inc("failed");
          log.error(e);
          console.log(`Failed extraction of items. ${request.url}`);
          console.error(e);
        }
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(
        `Request ${request.url} failed ${request.retryCount}} times`,
        error
      );
    }
  });

  const requestList = await createRequestList({ type, bfUrl });
  await crawler.addRequests(requestList);
  stats.add("urls", requestList.length);

  log.info("ACTOR - run crawler");
  await crawler.run();

  log.info("ACTOR - crawler end");
  await stats.save();

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", shop);
    log.info("invalidated Data CDN");
    await uploadToKeboola(type !== ActorType.FULL ? "mironet_bf" : "mironet");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
}

await Actor.main(main);
