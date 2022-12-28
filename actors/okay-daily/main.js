import { Actor, log, LogLevel, Dataset } from "apify";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import { restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { DOMParser, parseHTML } from "linkedom";

/** @enum */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum */
const Currency = {
  CZ: "CZK",
  SK: "EUR"
};

/** @enum */
const Labels = {
  MainSitemap: "MainSitemap",
  CollectionSitemap: "CollectionSitemap",
  List: "List"
};

function getBaseUrl(country) {
  switch (country) {
    case Country.CZ:
      return "https://www.okay.cz";
    case Country.SK:
      return "https://www.okay.sk";
  }
}

function productsSitemapsUrls(body) {
  const document = new DOMParser().parseFromString(body, "text/xml");
  return document
    .getElementsByTagNameNS("", "sitemap")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => url.includes("collections"));
}

function productUrlsFromSitemap(body) {
  const document = new DOMParser().parseFromString(body, "text/xml");
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim());
}

function extractProducts({ document, rootUrl, currency }) {
  const category = document
    .querySelectorAll(".breadcrumb li")
    .map(x => x.textContent.trim())
    .slice(1, -1)
    .join("/");

  return (
    document
      .querySelectorAll(".collection-matrix > [data-id]")
      ?.map(product => {
        const itemId = product.getAttribute("data-id");
        if (!itemId) {
          return;
        }

        const originalPrice = cleanPrice(
          product.querySelector(".was-price .money")?.innerText
        );
        const currentPrice = cleanPrice(
          product.querySelector(".money.final")?.innerText
        );

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
    type = ActorType.Full,
    development = process.env.TEST || process.env.DEBUG,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5,
    maxRequestRetries = 3,
    customTableName = null
  } = input ?? {};

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = getBaseUrl(country);
  const currency = Currency[country];

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const loadLazyImages = async ({ page }) => {
    await page.keyboard.down("End");
  };

  function navigationBehavior(timeoutSec) {
    return async (context, gotoOptions) => {
      gotoOptions.waitUntil = "networkidle";
      gotoOptions.timeout = 1000 * timeoutSec;
    };
  }

  const crawler = new PlaywrightCrawler({
    // headless: false,
    maxConcurrency,
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
    async requestHandler({ request, page, enqueueLinks, log }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const body = await page.content();
      const { label } = request.userData;
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
            const { document } = parseHTML(body.toString());
            const products = extractProducts({ document, rootUrl, currency });
            stats.add("items", products.length);
            await Dataset.pushData(products);
            const lastPage = document
              .querySelector(".pagination-list li:last-child")
              ?.innerText?.trim();
            if (lastPage) {
              const pages = Number(lastPage);
              const urls = restPageUrls(
                pages,
                nr => `${request.url}?page=${nr}`
              );
              await enqueueLinks({
                urls,
                userData: {
                  label: Labels.List
                }
              });
            }
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
    const suffix = type === ActorType.BlackFriday ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
