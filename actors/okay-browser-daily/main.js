import { PlaywrightCrawler } from "@crawlee/playwright";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum {string} */
const Currency = {
  CZ: "CZK",
  SK: "EUR"
};

/** @enum {string} */
const Labels = {
  MainSitemap: "MainSitemap",
  CollectionSitemap: "CollectionSitemap",
  List: "List",
  Detail: "Detail"
};

/**
 * @param {Country} country
 */
function getBaseUrl(country) {
  switch (country) {
    case Country.CZ:
      return "https://www.okay.cz";
    case Country.SK:
      return "https://www.okay.sk";
    default:
      throw new Error(`Unknown country ${country}`);
  }
}

/**
 * @param {string} body
 */
function productsSitemapsUrls(body) {
  const { document } = parseXML(body);
  return document
    .getElementsByTagNameNS("", "sitemap")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => url.includes("collections"));
}

/**
 * @param {string} body
 */
function productUrlsFromSitemap(body) {
  const { document } = parseXML(body);
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => !url.includes("nejprodavanejsi"));
}

export async function getTextFromLocator(locator) {
  try {
    return (await locator).textContent({ timeout: 1000 });
  } catch (e) {
    return;
  }
}

function extractProducts({ document, page, rootUrl, currency, url, type }) {
  const category = document
    .querySelectorAll(".breadcrumb li")
    .map(x => x.textContent.trim())
    .slice(1, -1)
    .join(" > ");

  return Promise.all(
    document.querySelectorAll(".collection-matrix > .product__grid-item[data-id]").map(async product => {
      const itemId = product.getAttribute("data-id");
      if (!itemId) {
        log.error("Missing itemId", { url });
        return;
      }

      // const originalPrice = cleanPrice(
      //   await getTextFromLocator(
      //     type === ActorType.BlackFriday
      //       ? // For Black Friday we need original price even if it is hidden in the listing
      //         page.locator(
      //           `.product__grid-item[data-id="${itemId}"] .was-price .money`
      //         )
      //       : // In normal mode we don't care about original prices and just compute real discount
      //         page.locator(
      //           `.product__grid-item[data-id="${itemId}"] .was-price .money:visible`
      //         )
      //   )
      // );
      const originalPrice = null;
      const currentPrice = cleanPrice(product.querySelector(".money.final")?.innerText);
      console.assert(currentPrice, "Missing currentPrice", { url });

      return {
        itemId,
        itemUrl: `${rootUrl}${product.querySelector("a").getAttribute("href")}`,
        img: product.querySelector("img[src]")?.getAttribute("src"),
        itemName: product.querySelector(".product-thumbnail__title").textContent.trim(),
        originalPrice,
        currentPrice,
        discounted: Boolean(originalPrice),
        currency,
        category,
        inStock: Boolean(product.querySelector(".in_stock"))
      };
    })
  );
}

function blackFridayUrl(country) {
  const collection = country === Country.CZ ? "to-nejlepsi-z-black-friday" : "to-najlepsie-z-black-friday";
  return [
    {
      url: `${getBaseUrl(country)}/collections/${collection}`,
      label: Labels.List
    }
  ];
}

function sitemapUrl(country) {
  return [
    {
      url: `${getBaseUrl(country)}/sitemap.xml`,
      userData: { label: Labels.MainSitemap }
    }
  ];
}

/**
 * @param {Country|string} country
 * @param {ActorType|string} type
 * @param {RequestOptions[]} urls
 * @return {RequestOptions[]}
 */
function startRequests(country, type, urls) {
  if (urls?.length) return urls;
  if (type === ActorType.BlackFriday) {
    return blackFridayUrl(country);
  }
  return sitemapUrl(country);
}

function parseBreadcrumbs(document) {
  const ld = document.querySelectorAll("script[type='application/ld+json']");
  const bl = Array.from(ld, x => {
    try {
      return JSON.parse(x.innerHTML);
    } catch (err) {}
  }).filter(x => x?.["@type"] === "BreadcrumbList")?.[0];
  return bl.itemListElement
    .slice(1, -1) // First is shop name, last is product name, so skip them
    .map(x => x.item.name)
    .join(" > ");
}

/**
 * @param params
 * @param {HTMLDocument} params.document
 * @param {string} params.url
 * @param {Set} params.processedIds
 * @param {Stats} params.stats
 */
function extractProductDetail({ document, url, processedIds, stats, currency }) {
  const itemId = document.querySelector("input[name=product-id]")?.value;
  if (!itemId) return stats.inc("failed");
  if (processedIds.has(itemId)) return stats.inc("itemsDuplicity");
  stats.inc("items");
  const img = document.querySelector("meta[property='og:image']")?.getAttribute("content");
  const itemName = document.querySelector("meta[property='og:title']")?.getAttribute("content");
  const product = document.querySelector(".product__information");
  const category = parseBreadcrumbs(document);

  // Original price is present either as "Doporučená cena výrobce" or "Nejnižší cena za posledních 30 dní"
  const recommendedPrice = cleanPrice(product.querySelector(".was-price .money")?.textContent);
  const lowestPriceLast30Days = cleanPrice(product.querySelector(".compare_price .money")?.textContent);
  
  // Only one of the fields is actually present at a time.
  const originalPrice = recommendedPrice ?? lowestPriceLast30Days;

  // Current price is called "Cena s DPH"
  const currentPrice = cleanPrice(product.querySelector(".current-price-incl-vat .money")?.textContent);

  return {
    itemId,
    itemUrl: url,
    img,
    itemName,
    originalPrice,
    currentPrice,
    discounted: Boolean(originalPrice),
    currency,
    category,
    inStock: Boolean(product.querySelector(".in_stock"))
  };
}

async function loadLazyImages({ page }) {
  await page.keyboard.down("End");

  await page.evaluate(() => {
    /* global window, document */
    if (!document.body) return;
    document.body.scrollIntoView(false);
    const height = document.body.scrollHeight;
    window.scrollTo(0, height);
  });

  await page.waitForLoadState("networkidle");
}

function navigationBehavior(timeoutSec) {
  return async (context, gotoOptions) => {
    log.info(`Navigation to ${context.request.url}`);
    gotoOptions.waitUntil = "load";
    gotoOptions.timeout = 1000 * timeoutSec;
  };
}

async function main() {
  const rollbar = Rollbar.init();

  const processedIds = new Set();
  const stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const {
    development,
    debug,
    proxyGroups,
    maxRequestRetries,
    country = Country.CZ,
    customTableName = null,
    type = ActorType.Full,
    urls
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = getBaseUrl(country);
  const currency = Currency[country];

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new PlaywrightCrawler({
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    //headless: false,
    browserPoolOptions: {
      useFingerprints: true,
      fingerprintOptions: {
        fingerprintGeneratorOptions: { locales: ["cs-CZ", "sk-SK"] }
      }
    },
    preNavigationHooks: [navigationBehavior(60)],
    //postNavigationHooks: [loadLazyImages],
    async requestHandler({ request, page, enqueueLinks, log, saveSnapshot, infiniteScroll }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const { label } = request.userData;

      switch (label) {
        case Labels.MainSitemap:
          {
            const body = await page.content();
            const urls = productsSitemapsUrls(body);
            log.info(`Found ${urls.length} collection sitemaps`);
            await enqueueLinks({
              urls,
              userData: { label: Labels.CollectionSitemap }
            });
          }
          break;
        case Labels.CollectionSitemap:
          {
            const body = await page.content();
            const urls = productUrlsFromSitemap(body);
            log.info(`Found ${urls.length} collection urls`);
            await enqueueLinks({
              urls,
              userData: { label: Labels.List }
            });
          }
          break;
        case Labels.List:
          {
            //infiniteScroll({ scrollDownAndUp: true });
            // await saveSnapshot({
            //   key: new URL(request.url).pathname
            //     .split("/")
            //     .filter(Boolean)
            //     .at(-1)
            //     ?.replace(/[^a-zA-Z0-9!\-_\.\'\(\)]/g, "!")
            // });
            const body = await page.content();
            const { document } = parseHTML(body.toString());
            if (type === ActorType.BlackFriday) {
              const detailLinks = document.querySelectorAll(".collection-matrix > [data-id] a[href]");
              const details = Array.from(detailLinks, x => x.href);
              await enqueueLinks({ urls: details, label: Labels.Detail });
            } else {
              const products = await extractProducts({
                document,
                page,
                rootUrl,
                currency,
                url: request.url,
                type
              });
              await Dataset.pushData(products);
              stats.add("items", products.length);
            }

            const nextPage = document.querySelector(`.paginate:not(.non-boost-pagination) .pagination-next`)?.href;
            if (nextPage) {
              await enqueueLinks({ urls: [nextPage], label: Labels.List });
            }
          }
          break;
        case Labels.Detail:
          {
            const body = await page.content();
            const { document } = parseHTML(body.toString());
            const product = extractProductDetail({
              document,
              url: request.url,
              currency,
              processedIds,
              stats
            });
            if (product) await Dataset.pushData(product);
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, request);
      rollbar.error(error, request);
      stats.inc("failed");
    }
  });

  await crawler.run(startRequests(country, type, urls));
  await stats.save(true);

  if (!development) {
    const tableName = customTableName ?? `${shopName(rootUrl)}-browser`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
