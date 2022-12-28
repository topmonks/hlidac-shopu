import { Actor, log, LogLevel, Dataset } from "apify";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { HttpCrawler } from "@crawlee/http";
import { DOMParser, parseHTML } from "linkedom";

/** @enum */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum */
const Labels = {
  MainSitemap: "MainSitemap",
  ProductSitemap: "ProductSitemap",
  Detail: "Detail"
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
  const document = new DOMParser().parseFromString(body.toString(), "text/xml");
  return document
    .getElementsByTagNameNS("", "sitemap")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => url.includes("products"));
}

function productUrlsFromSitemap(body) {
  const document = new DOMParser().parseFromString(body.toString(), "text/xml");
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim());
}

function extractProduct(url, document) {
  const itemId = document
    .querySelector(".productInfox")
    ?.getAttribute("data-id");
  if (!itemId) {
    log.warning(`No itemId found for ${url}`);
    return;
  }

  const manufacturersRecommendedPrice = cleanPrice(
    document.querySelector(".modal_price .was-price .money")?.innerText
  );
  const price = cleanPrice(
    document.querySelector(".modal_price .current_price .money")?.innerText
  );
  const priceAfterDiscount = cleanPrice(
    document.querySelector(".modal_price .current_price_mz .money.sale")
      ?.innerText
  );
  const originalPrice = manufacturersRecommendedPrice
    ? manufacturersRecommendedPrice
    : priceAfterDiscount
    ? price
    : null;
  const currentPrice = priceAfterDiscount ? priceAfterDiscount : price;

  return {
    itemId,
    itemUrl: url,
    img: document
      .querySelector("[property=og:image:secure_url]")
      .getAttribute("content"),
    itemName: document.querySelector(".product_name").textContent.trim(),
    originalPrice,
    currentPrice,
    discounted: Boolean(originalPrice),
    currency: document
      .querySelector("[property=og:price:currency]")
      .getAttribute("content"),
    category: document
      .querySelectorAll(".breadcrumb li a")
      .map(x => x.textContent.trim())
      .slice(1, -1)
      .join("/"),
    inStock: Boolean(currentPrice)
  };
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

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const requestQueue = await Actor.openRequestQueue();

  const httpCrawler = new HttpCrawler({
    maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    proxyConfiguration,
    async requestHandler({ request, body, enqueueLinks, log }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const { label } = request.userData;
      switch (label) {
        case Labels.MainSitemap:
          {
            const urls = productsSitemapsUrls(body);
            log.info(`Found ${urls.length} product sitemaps`);
            await enqueueLinks({
              urls,
              userData: {
                label: Labels.ProductSitemap
              }
            });
          }
          break;
        case Labels.ProductSitemap:
          {
            const urls = productUrlsFromSitemap(body);
            log.info(`Found ${urls.length} product urls`);
            await requestQueue.addRequests(urls.map(url => ({ url })));
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await httpCrawler.run([
    {
      url: `${getBaseUrl(country)}/sitemap.xml`,
      userData: { label: Labels.MainSitemap }
    }
  ]);

  const browserCrawler = new PlaywrightCrawler({
    requestQueue,
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
    async requestHandler({ request, page, log }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const body = await page.content();
      stats.inc("items");
      const { document } = parseHTML(body.toString());
      const product = extractProduct(request.url, document);
      if (product) await Dataset.pushData(product);
    },
    async failedRequestHandler({ request, log }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await browserCrawler.run();
  await stats.save(true);

  if (!development) {
    const rootUrl = getBaseUrl(country);
    const suffix = type === ActorType.BlackFriday ? "_bf" : "";
    const tableName = customTableName ?? `${shopName(rootUrl)}${suffix}`;
    await uploadToKeboola(tableName);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
