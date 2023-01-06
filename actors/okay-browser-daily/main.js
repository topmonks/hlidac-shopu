// @ts-check
import { Actor, log, LogLevel, Dataset } from "apify";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { DOMParser, parseHTML } from "linkedom";

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
  List: "List"
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
  const document = new DOMParser().parseFromString(body, "text/xml");
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
  const document = new DOMParser().parseFromString(body, "text/xml");
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => !url.includes("nejprodavanejsi"));
}

export async function getTextFromLocator(locator) {
  try {
    return await (await locator).textContent({ timeout: 1000 });
  } catch (e) {
    return;
  }
}

function extractProducts({ document, page, rootUrl, currency, url }) {
  const category = document
    .querySelectorAll(".breadcrumb li")
    .map(x => x.textContent.trim())
    .slice(1, -1)
    .join("/");

  return Promise.all(
    document
      .querySelectorAll(".collection-matrix > [data-id]")
      ?.map(async product => {
        const itemId = product.getAttribute("data-id");
        if (!itemId) {
          log.error("Missing itemId", { url });
          return;
        }

        const originalPrice = cleanPrice(
          await getTextFromLocator(
            page.locator(`[data-id="${itemId}"] .was-price .money:visible`)
          )
        );
        const currentPrice = cleanPrice(
          product.querySelector(".money.final")?.innerText
        );
        console.assert(currentPrice, "Missing currentPrice", { url });

        return {
          itemId,
          itemUrl: `${rootUrl}${product
            .querySelector("a")
            .getAttribute("href")}`,
          img: product.querySelector("img[src]")?.getAttribute("src"),
          itemName: product
            .querySelector(".product-thumbnail__title")
            .textContent.trim(),
          originalPrice,
          currentPrice,
          discounted: Boolean(originalPrice),
          currency,
          category,
          inStock: Boolean(product.querySelector(".in_stock"))
        };
      }) ?? []
  );
}

async function main() {
  const rollbar = Rollbar.init();

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0
  });

  const input = (await Actor.getInput()) || {};
  const {
    country = Country.CZ,
    development = process.env.TEST || process.env.DEBUG,
    proxyGroups = ["CZECH_LUMINATI"],
    maxRequestRetries = 3,
    customTableName = null
  } = input;

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = getBaseUrl(country);
  const currency = Currency[country];

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  // TODO: does not work
  async function loadLazyImages({ page }) {
    await page.keyboard.down("End");

    await page.evaluate(() => {
      document.body.scrollIntoView(false);
      const height = document.body.scrollHeight;
      window.scrollTo(0, height);
    });

    await page.waitForLoadState("networkidle");
  }

  function navigationBehavior(timeoutSec) {
    return async (context, gotoOptions) => {
      log.info(`Navigation to ${context.request.url}`);
      gotoOptions.waitUntil = "networkidle";
      gotoOptions.timeout = 1000 * timeoutSec;
    };
  }

  const crawler = new PlaywrightCrawler({
    maxRequestRetries,
    useSessionPool: true,
    proxyConfiguration,
    browserPoolOptions: {
      useFingerprints: true,
      fingerprintOptions: {
        fingerprintGeneratorOptions: { locales: ["cs-CZ", "sk-SK"] }
      }
    },
    preNavigationHooks: [navigationBehavior(60)],
    postNavigationHooks: [loadLazyImages],
    async requestHandler({ request, page, enqueueLinks, log, saveSnapshot }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const { label } = request.userData;
      const body = await page.content();

      switch (label) {
        case Labels.MainSitemap:
          {
            const urls = productsSitemapsUrls(body);
            log.info(`Found ${urls.length} collection sitemaps`);
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.CollectionSitemap
              }
            });
          }
          break;
        case Labels.CollectionSitemap:
          {
            const urls = productUrlsFromSitemap(body);
            log.info(`Found ${urls.length} collection urls`);
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.List
              }
            });
          }
          break;
        case Labels.List:
          {
            await saveSnapshot({
              key: new URL(request.url).pathname
                .split("/")
                .filter(Boolean)
                .at(-1)
            });
            const { document } = parseHTML(body.toString());
            const products = await extractProducts({
              document,
              page,
              rootUrl,
              currency,
              url: request.url
            });
            stats.add("items", products.length);
            await Dataset.pushData(products);
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run([
    {
      url: `${getBaseUrl(country)}/sitemap.xml`,
      userData: { label: Labels.MainSitemap }
    }
  ]);
  await stats.save(true);

  if (!development) {
    const tableName = customTableName ?? `${shopName(rootUrl)}-browser`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
