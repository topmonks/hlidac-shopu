import { Actor, LogLevel, log } from "apify";
import { HttpCrawler } from "@crawlee/http";

import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const ROOT_URL = "https://allegro.cz/";
const PROCESSED_IDS_KEY = "processedIds";
const YANDEX_PREFIX = 'https://translate.yandex.com/translate?lang=ar-en&url=';

const Label = {
  Start: "Start",
  Product: "Product",
  Category: "Category",
  CZC_Category: "CZC_Category",
  Subcategory: "Subcategory"
};

async function handleProducts(document, processedIds) {
  const categories = document
    .querySelectorAll('ol[data-role="breadcrumbs-list"] span')
    .map((cat) => cat?.textContent?.trim() ?? "");

  categories.shift();

  const products = [];
  const productElements = document.querySelectorAll("article");
  let duplicates = 0;

  function getRedirectParameter(url) {
    const params = new URLSearchParams(new URL(url).search);
    return params.get("redirect") || undefined;
  }

  for (const prod of productElements) {
    let itemUrl = prod.querySelector("article h2 > a[href]").getAttribute("href").trim();
    itemUrl = getRedirectParameter(itemUrl) ?? itemUrl;

    const itemId = itemUrl.match(/-(\d+)(\?|$)/)?.[1];

    if (!itemId) {
      throw new Error(`Failed to extract itemId from ${itemUrl}`);
    }

    if (processedIds.has(itemId)) {
      duplicates += 1;
      continue;
    }

    processedIds.add(itemId);

    const originalPrice =
      cleanPrice(prod.querySelector('span[style*="font-weight:normal;text-decoration:line-through"]')?.textContent) ??
      null;
    const currentPrice = cleanPrice(prod.querySelector("span[aria-label] > span")?.textContent)
      || cleanPrice(prod.querySelector('[data-test-tag="price-container"]')?.textContent) || null;
    const imageElement = prod.querySelector("img");

    products.push({
      itemId,
      itemName: prod.querySelector("article h2 > a[href]").textContent.trim(),
      itemUrl: itemUrl.split('https/')?.[1] ? `https://${itemUrl.split('https/')?.[1]}` : itemUrl,
      img: extractAllegroUrl(imageElement.getAttribute("data-src") || imageElement.getAttribute("src")),
      currentPrice,
      inStock: !!currentPrice,
      originalPrice,
      discounted: !!originalPrice,
      currency: "CZK",
      category: categories
    });
  }
  await Actor.pushData(products);
  return {
    totalProducts: productElements.length,
    savedProducts: products.length,
    duplicates
  };
}

function createPaginationRequests(document, url) {
  const pageCount = Number.parseInt(document.querySelector('div > div[role="navigation"] > span').textContent);
  const paginationRequests = [];

  if (url.includes('translated.turbopages.org/proxy_u')) {
    url = extractAllegroUrl(url);
  };

  if (!url.includes(YANDEX_PREFIX)) {
    url = `${YANDEX_PREFIX}${url}`;
  }

  for (let i = 2; i < pageCount + 1; i++) {
    if (!url) {
      log.error(`Failed to extract url for pagination request`);
      continue;
    }

    paginationRequests.push({
      url: `${url}?p=${i}`,
      label: Label.Product,
      userData: {
        pagination: true
      }
    });
  }
  return paginationRequests;
}

function extractAllegroUrl(yandexUrl) {
  const regex = /https:\/\/translated\.turbopages\.org\/proxy_u\/ar-en\.en\.[\w-]+\/(https.*)/;
  const match = yandexUrl.match(regex);
  return match ? match[1].replace('https/', 'https://') : yandexUrl.replace(YANDEX_PREFIX, '');
}

const tryParseJson = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

async function main() {
  const rollbar = Rollbar.init();

  const input = await Actor.getInput();
  // @ts-ignore
  const { development = false, debug = false, proxyGroups = [], type = ActorType.Full } = input || {};
  // @ts-ignore
  const inputtedUrls = input?.urls ?? [];

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    duplicates: 0
  });

  // @ts-ignore
  const processedIds = new Set((await Actor.getValue(PROCESSED_IDS_KEY)) || []);
  Actor.on("persistState", async () => {
    await Actor.setValue(PROCESSED_IDS_KEY, Array.from(processedIds));
  });

  // manually open the default request queue as it is not always done
  // automatically by the platform for some reason (needed when migrating)
  const requestQueue = await Actor.openRequestQueue();

  const crawler = new HttpCrawler({
    requestQueue,
    useSessionPool: true,
    proxyConfiguration,
    maxRequestRetries: 60,
    navigationTimeoutSecs: 45,
    maxConcurrency: 15,
    async requestHandler({ request, body, log }) {
      const { label } = request;
      log.debug(`[${label}] - handling ${request.url}`);

      const { document } = parseHTML(body.toString());

      if (document.querySelector('title').textContent.includes('Are you not a robot')
        || document.querySelector('html.state-unresolved.state-withDirect')) {
        log.error(`[${label}] - Got a captcha, will retry`);
        throw new Error("Got a captcha");
      }

      switch (label) {
        case Label.Start:
          {
            const requestsToAdd = document
              .querySelectorAll('a[data-description="navigation-layers category link"]')
              // @ts-ignore
              .map((cat) => ({
                url: `${YANDEX_PREFIX}${extractAllegroUrl(new URL(cat.href, ROOT_URL).href)}`,
                label: Label.Category
              }));

            if (type === ActorType.Test) {
              await crawler.addRequests(requestsToAdd.slice(0, 2));
            } else {
              await crawler.addRequests(requestsToAdd);
            }
            stats.add("categories", requestsToAdd.length);
            log.info(`[${label}]: ${extractAllegroUrl(request.url)} - Added ${requestsToAdd.length} top level categories`, { url: request.url });
          }
          break;
        case Label.Category:
          {
            const categoryRequests = document
              .querySelectorAll("a.carousel-item")
              // @ts-ignore
              .map((cat) => {
                if (!cat.href) return;

                return {
                  url: `${YANDEX_PREFIX}${extractAllegroUrl(new URL(cat.href, ROOT_URL).href)}`,
                  label: Label.Subcategory,
                };
              })
              .filter(Boolean);

            if (type === ActorType.Test) {
              await crawler.addRequests(categoryRequests.slice(0, 1));
            } else {
              await crawler.addRequests(categoryRequests);
            }

            stats.add("categories", categoryRequests.length);
            log.info(`[${label}]: ${extractAllegroUrl(request.url)} - Added ${categoryRequests.length} subcategories`, { url: request.url });
          }
          break;
        case Label.CZC_Category:
          {
            const scripts = document.querySelectorAll('script[type="application/json"]');
            let scriptContent = null;

            scripts.forEach((script) => {
              if (script.innerHTML.includes('searchSellerName')) {
                scriptContent = script.innerHTML;
              }
            });

            if (scriptContent) {
              const categoryRequests = tryParseJson(scriptContent).headerBanner.categoryNavigation.categoryNavigationItems.flatMap((categoryList) => {
                return categoryList.items.flatMap((category) => {
                  return category.items.map((item) => ({
                    url: `${YANDEX_PREFIX}${item.link}`,
                    label: Label.Subcategory,
                  }));
                });
              });
  
              if (type === ActorType.Test) {
                await crawler.addRequests(categoryRequests.slice(0, 1));
              } else {
                await crawler.addRequests(categoryRequests);
              }
  
              stats.add("categories", categoryRequests.length);
              log.info(`[${label}]: ${extractAllegroUrl(request.url)} - Added ${categoryRequests.length} subcategories`, { url: request.url });
            }
          }
          break;
        case Label.Subcategory:
          {

            const subcategoryLinks = document.querySelectorAll('[data-role="LinkItemAnchor"]');
            const subcategoryItems = document.querySelectorAll('[data-role="LinkItem"]');

            // we reached the lowest subcategory - one of the navigation items is not clickable
            if (subcategoryLinks.length !== subcategoryItems.length) {
              const { totalProducts, savedProducts, duplicates } = await handleProducts(document, processedIds);
              stats.add("products", totalProducts);
              stats.add("duplicates", duplicates);

              const paginationRequests = createPaginationRequests(document, request.url);
              if (type === ActorType.Test) {
                await crawler.addRequests(paginationRequests.slice(0, 2));
              } else {
                await crawler.addRequests(paginationRequests);
              }

              log.info(
                `[${label}]: ${extractAllegroUrl(request.url)} - Reached lowest subcategory, found ${totalProducts} products, saved ${savedProducts}, added ${paginationRequests.length} pagination requests`
                , { url: request.url });
              return;
            }

            // @ts-ignore
            const categoryRequests = subcategoryLinks.map((cat) => {
              if (!cat.href) return;

              return {
                url: `${YANDEX_PREFIX}${extractAllegroUrl(new URL(cat.href, ROOT_URL).href)}`,
                label: Label.Subcategory
              };
            }).filter(Boolean);

            if (type === ActorType.Test) {
              await crawler.addRequests(categoryRequests.slice(0, 1));
            } else {
              await crawler.addRequests(categoryRequests);
            }
            stats.add("categories", categoryRequests.length);
            log.info(`[${label}]: ${extractAllegroUrl(request.url)} - Found ${categoryRequests.length} subcategories`, { url: request.url });
          }
          break;
        case Label.Product:
          {
            const { totalProducts, savedProducts, duplicates } = await handleProducts(document, processedIds);
            stats.add("products", totalProducts);
            stats.add("duplicates", duplicates);
            log.info(`[${label}]: ${extractAllegroUrl(request.url)} - Found ${totalProducts} products, saved ${savedProducts}`, { url: request.url });
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} ${error.message} failed multiple times`);
      stats.inc("failed");
    }
  });

  const requests = [];
  for (const inputtedUrl of inputtedUrls) {
    const url = new URL(inputtedUrl);

    if (url.host !== "allegro.cz") {
      log.warning(`Skipping ${inputtedUrl}, not an url from allegro.cz`);
    }

    if (url.origin === ROOT_URL) {
      requests.push({
        url: `${YANDEX_PREFIX}${ROOT_URL}`,
        label: Label.Start
      });
      continue;
    }

    if (url.pathname === '/obchod/czc-cz') {
      requests.push({
        url: `${YANDEX_PREFIX}${inputtedUrl}`,
        label: Label.CZC_Category
      });
      continue;
    } else if (url.pathname.includes('/obchod/czc-cz')) {
      requests.push({
        url: `${YANDEX_PREFIX}${inputtedUrl}`,
        label: Label.Subcategory
      });
      continue
    }

    const firstPathSegment = url.pathname.split("/")[1] ?? "";
    if (firstPathSegment === "doporucujeme") {
      requests.push({
        url: `${YANDEX_PREFIX}${inputtedUrl}`,
        label: Label.Category
      });
      continue;
    }

    if (firstPathSegment === "kategorie") {
      requests.push({
        url: `${YANDEX_PREFIX}${inputtedUrl}`,
        label: Label.Subcategory
      });
      continue;
    }

    log.warning(`Skipping ${inputtedUrl}, only home-page/category/recommended urls are supported`);
  }

  if (requests.length === 0) {
    log.info("Got no urls on the input, will start from the home page");
    requests.push({
      url: `${YANDEX_PREFIX}${ROOT_URL}`,
      label: Label.Start
    });
  }

  await crawler.run(requests);
  await stats.save(true);

  if (!development) {
    await uploadToKeboola("allegro_cz");
  }
}

await Actor.main(main, { statusMessage: "DONE" });
