import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { DOMParser, parseHTML } from "linkedom/cached";
import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import zlib from "zlib";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { itemSlug, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler } from "@crawlee/http";
import { restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";

/** @enum */
const Labels = {
  Category: "category",
  Categories: "categories",
  SaleCategory: "category_vyprodej",
  Page: "page",
  Pages: "pages"
};

/**
 * @param {Buffer} buffer
 * @returns {{url: string, userData: {label: Labels.Page, baseUrl: string}}[]}
 */
function allCategoriesRequests(buffer) {
  log.info("Loading Sitemap");
  const markup = zlib.unzipSync(buffer).toString();
  const document = new DOMParser().parseFromString(markup, "text/xml");
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => {
      const url = x.textContent.trim();
      return {
        url,
        userData: {
          label: Labels.Page,
          baseUrl: url
        }
      };
    });
}

/**
 * @param {{type:ActorType, bfUrl:string}}
 * @returns {{url: string, userData: {label: Labels, baseUrl?: string}}}
 */
function startingRequest({ type, bfUrl }) {
  switch (type) {
    case ActorType.BF:
      return {
        url: bfUrl,
        userData: {
          label: Labels.SaleCategory
        }
      };
    case ActorType.TEST:
      return {
        url: "https://www.mironet.cz/graficke-karty+c14402/",
        userData: {
          label: Labels.Page,
          baseUrl: "https://www.mironet.cz/graficke-karty+c14402/"
        }
      };
    case ActorType.FULL:
      return {
        url: "https://www.mironet.cz/sm/sitemap_kategorie_p_1.xml.gz",
        userData: {
          label: Labels.Categories
        }
      };
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

/**
 *
 * @param {{document: Document, rootUrl: string}}
 * @returns {string[]}
 */
function saleUrls({ document, rootUrl }) {
  const categoriesUrls = [];
  let onclickUrl;
  document.querySelectorAll(".vyprodej_category_head").map(category => {
    const moreBox = category.querySelector(".bpMoreBox");
    if (moreBox) {
      moreBox.querySelectorAll("a").map(a => {
        categoriesUrls.push(`${rootUrl}${a.getAttribute("href")}`);
      });
    } else {
      const onClick = category.getAttribute("onclick");
      onclickUrl = onClick.replace("location.href=", "").replace(/'/g, "");
    }
  });
  if (categoriesUrls.length) {
    return categoriesUrls;
  } else if (onclickUrl) {
    return [new URL(onclickUrl, rootUrl).href];
  }
}

/**
 * @param {{document: Document, requestUrl: string, rootUrl: string}}
 * @returns {{url: string, userData: {label: Labels.Page, baseUrl: string}}[]}
 */
function categoryRequests({ document, requestUrl, rootUrl }) {
  const browseSubCategories = document
    .querySelectorAll("div#BrowseSubCategories > a")
    .map(a => a.getAttribute("href"));
  if (browseSubCategories.length) {
    return browseSubCategories.map(categoryUrl => {
      const url = new URL(categoryUrl, rootUrl).href;
      return {
        url,
        userData: {
          label: Labels.Page,
          baseUrl: url
        }
      };
    });
  }

  log.debug(`Enqueue ${requestUrl.url} as a page`);
  return [
    {
      url: requestUrl,
      userData: {
        label: Labels.Page,
        baseUrl: requestUrl
      }
    }
  ];
}

/**
 * @param {{document: Document, request: {url: string, userData: {baseUrl: string}}}}
 * @returns {string[]}
 */
function pageUrls({ document, request }) {
  const pageNum = document.querySelectorAll("a.PageNew").reduce((max, a) => {
    const pageNumber = parseInt(a.innerText.trim());
    return pageNumber > max ? pageNumber : max;
  }, 0);
  log.debug(`Found ${pageNum} pages on ${request.url}`);
  const { baseUrl } = request.userData;
  return restPageUrls(pageNum, pageNr => {
    const url = new URL(baseUrl);
    url.searchParams.append("PgID", pageNr);
    return url.href;
  });
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

  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = process.env.TEST || process.env.DEBUG,
    maxRequestRetries = 3,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrl = "https://www.mironet.cz/vyprodej/?v=blue-friday"
  } = input;
  const rootUrl = "https://www.mironet.cz";
  const shop = shopName(rootUrl);

  if (development) {
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
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/x-gzip"],
    async requestHandler({ body, request, enqueueLinks, crawler }) {
      log.info(`Processing ${request.url}`);
      const { label } = request.userData;
      if (label === Labels.Categories) {
        const requests = allCategoriesRequests(body);
        await crawler.requestQueue.addRequests(requests);
        return;
      }
      const { document } = parseHTML(body.toString());
      const isCategoryPage = label === Labels.Page || label === Labels.Pages;
      if (label === Labels.SaleCategory) {
        const urls = saleUrls({ document, rootUrl });
        stats.add("urls", urls.length);
        await enqueueLinks({
          urls,
          userData: {
            label: Labels.Category
          }
        });
      } else if (label === Labels.Category) {
        const requests = categoryRequests({
          document,
          requestUrl: request.url,
          rootUrl
        });
        stats.add("urls", requests.length);
        await crawler.requestQueue.addRequests(requests);
      } else if (isCategoryPage) {
        if (label === Labels.Page) {
          const urls = pageUrls({ document, request });
          if (!urls.length) return;
          stats.add("pages", urls.length);
          await enqueueLinks({
            urls,
            userData: {
              label: Labels.Pages,
              baseUrl: request.userData.baseUrl
            }
          });
        }
        const breadCrumbs = document
          .querySelectorAll("div#displaypath > a.CatParent")
          .map(cat => cat.innerText.trim());
        const requests = document.querySelectorAll(".item_b").flatMap(item => {
          const toNumber = p => parseInt(p.replace(/\s/g, "").match(/\d+/)[0]);
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
            itemUrl: `${rootUrl}${link}`,
            itemName: name,
            discounted: !!oPriceElem,
            currentPrice: price ? toNumber(price) : null,
            breadCrumbs
          };
          if (oPriceElem) {
            const oPrice = oPriceElem.innerText.trim();
            dataItem.originalPrice = toNumber(oPrice);
          }
          if (!processedIds.has(dataItem.itemId)) {
            processedIds.add(dataItem.itemId);
            const slug = itemSlug(dataItem.itemUrl);
            return [
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
            ];
          } else {
            stats.inc("itemsDuplicity");
            return null;
          }
        });
        stats.add("items", requests.length);
        log.debug(
          `Found ${requests.length} items, storing them. ${request.url}`
        );
        await Promise.all(requests);
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(
        `Request ${request.url} failed ${request.retryCount} times`,
        error
      );
    }
  });

  const request = startingRequest({ type, bfUrl });
  log.info("ACTOR - run crawler");
  await crawler.run([request]);

  log.info("ACTOR - crawler end");
  await stats.save(true);

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", shop);
    log.info("invalidated Data CDN");
    await uploadToKeboola(type !== ActorType.FULL ? "mironet_bf" : "mironet");
    log.info("upload to Keboola finished");
  }
  log.info("ACTOR - Finished");
}

await Actor.main(main);
