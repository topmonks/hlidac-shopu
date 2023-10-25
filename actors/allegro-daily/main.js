import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, LogLevel, log } from "apify";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { FingerprintGenerator } from "fingerprint-generator";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";

const ROOT_URL = "https://allegro.cz/";

const Label = {
  Start: "Start",
  Product: "Product",
  Category: "Category",
  Subcategory: "Subcategory"
};

async function main() {
  // fingerprint generator to generate headers to help with the blocking
  const fingerprintGenerator = new FingerprintGenerator({
    // chrome is getting blocked a lot for some reason
    browsers: ["firefox", "safari"],
    operatingSystems: ["windows", "macos"]
  });
  const rollbar = Rollbar.init();

  const input = await Actor.getInput();
  const {
    development = true,
    debug = false,
    proxyGroups = [],
    type = ActorType.Full
  } = input || {};
  console.log(input);
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

  const processedIds = (await Actor.getValue("processedIds")) || {};
  Actor.on("persistState", async () => {
    await Actor.setValue("processedIds", processedIds);
  });

  // manually open the default request queue as it is not always done
  // automatically by the platform for some reason (needed when migrating)
  const requestQueue = await Actor.openRequestQueue();

  const crawler = new HttpCrawler({
    requestQueue,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    maxRequestRetries: 50,
    navigationTimeoutSecs: 60,
    sessionPoolOptions: {
      // limit the pool size so we have stable proxies
      maxPoolSize: 50
    },
    preNavigationHooks: [
      async ({ request }) => {
        const generatedHeaders = fingerprintGenerator.getFingerprint().headers;
        request.headers = {
          "user-agent": generatedHeaders["user-agent"],
          "accept": generatedHeaders["accept"],
          "accept-encoding": generatedHeaders["accept-encoding"],
          "accept-language": generatedHeaders["accept-language"]
        };
      }
    ],
    async requestHandler({ request, body, log }) {
      const { label } = request;
      log.debug(`${label} - handling ${request.url}`);

      switch (label) {
        case Label.Start:
          {
            const { document } = parseHTML(body.toString());
            const requestsToAdd = document
              .querySelectorAll(
                'a[data-description="navigation-layers category link"]'
              )
              .map(cat => ({
                url: new URL(cat.href, ROOT_URL).href,
                label: Label.Category,
              }));

            if (type === ActorType.Test) {
              await crawler.addRequests(requestsToAdd.slice(0, 2));
            } else {
              await crawler.addRequests(requestsToAdd);
            }
            stats.add("categories", requestsToAdd.length);
            log.info(
              `${request.url} - Added ${requestsToAdd.length} top level categories`
            );
          }
          break;
        case Label.Category:
          {
            const { document } = parseHTML(body.toString());
            const categoryRequests = document
              .querySelectorAll("a.carousel-item")
              .map(cat => {
                const prevCategories = request.userData.categories ?? [];
                return {
                  url: new URL(cat.href, ROOT_URL).href,
                  label: Label.Subcategory,
                };
              });
            if (type === ActorType.Test) {
              await crawler.addRequests(categoryRequests.slice(0, 1));
            } else {
              await crawler.addRequests(categoryRequests);
            }
            stats.add("categories", categoryRequests.length);
            log.info(
              `${request.url} - Found ${categoryRequests.length} categories`
            );
          }
          break;
        case Label.Subcategory:
          {
            const { document } = parseHTML(body.toString());

            const subcategoryLinks = document.querySelectorAll('[data-role="LinkItemAnchor"]');
            const subcategoryItems = document.querySelectorAll('[data-role="LinkItem"]');

            // we reached the lowest subcategory - one of the navigation items is not clickable
            if (subcategoryLinks.length !== subcategoryItems.length) {
              log.info(`${request.url} - Reached lowest subcategory, will begin to scrape products`);
              crawler.addRequests([{
                url: request.url,
                label: Label.Product,
                uniqueKey: `${request.url}-products`,
              }]);
              return;
            }

            const categoryRequests = subcategoryLinks
              .map(cat => {
                return {
                  url: new URL(cat.href, ROOT_URL).href,
                  label: Label.Subcategory,
                };
              });
            
            if (type === ActorType.Test) {
              await crawler.addRequests(categoryRequests.slice(0, 1));
            } else {
              await crawler.addRequests(categoryRequests);
            }
            stats.add("categories", categoryRequests.length);
            log.info(
              `${request.url} - Found ${categoryRequests.length} subcategories`
            );
          }
          break;
        case Label.Product:
          {
            const { document } = parseHTML(body.toString());
            const { pagination = false } = request.userData;
            const categories = document
              .querySelectorAll('ol[data-role="breadcrumbs-list"] span')
              .map(cat => cat?.textContent?.trim() ?? '');

            const products = [];
            const productElements = document.querySelectorAll("article");
            for (const prod of productElements) {
              const itemId =
                prod
                  .getAttribute(
                    "data-analytics-view-custom-representative-offer-id"
                  )
                  ?.trim() ??
                prod.getAttribute("data-analytics-view-value")?.trim();
              if (processedIds[itemId]) {
                stats.inc("duplicates");
                continue;
              }
              processedIds[itemId] = true;

              const originalPrice =
                cleanPrice(
                  prod.querySelector(
                    'span[style="font-weight:normal;text-decoration:line-through;"]'
                  )?.textContent
                ) ?? null;
              const currentPrice =
                cleanPrice(
                  prod.querySelector("span[aria-label] > span")?.textContent
                ) ?? null;
              const imageElement = prod.querySelector("img");
              products.push({
                itemId,
                itemName: prod.querySelector("h2 > a[href]").textContent.trim(),
                itemUrl: prod
                  .getAttribute("data-analytics-view-custom-product-offer-url")
                  .trim(),
                img:
                  imageElement.getAttribute("data-src") ??
                  imageElement.getAttribute("src"),
                currentPrice,
                inStock: !!currentPrice,
                originalPrice,
                discounted: !!originalPrice,
                currency: "CZK",
                category: categories
              });
            }
            await Actor.pushData(products);
            stats.add("products", productElements.length);

            if (pagination) {
              log.info(
                `${request.url} - found ${productElements.length} products, saved ${products.length}`
              );
              return;
            }

            const pageCount = Number.parseInt(
              document.querySelector('div > div[role="navigation"] > span')
                .textContent
            );
            const paginationRequests = [];
            for (let i = 2; i < pageCount + 1; i++) {
              paginationRequests.push({
                url: `${request.url}?p=${i}`,
                label: Label.Product,
                userData: {
                  pagination: true
                }
              });
            }
            if (type === ActorType.Test) {
              await crawler.addRequests(paginationRequests.slice(0, 2));
            } else {
              await crawler.addRequests(paginationRequests);
            }
            log.info(
              `${request.url} - found ${productElements.length} products, saved ${products.length}, added ${paginationRequests.length} pagination requests`
            );
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(
        `Request ${request.url} ${error.message} failed multiple times`
      );
      stats.inc("failed");
    }
  });

  const requests = [];
  for (const inputtedUrl of inputtedUrls) {
    const url = new URL(inputtedUrl);

    if (url.host !== 'allegro.cz') {
      log.warning(`Skipping ${inputtedUrl}, not an url from allegro.cz`)
    }

    if (url.origin === ROOT_URL) {
      requests.push({
        url: ROOT_URL,
        label: Label.Start
      });
      continue;
    }

    const firstPathSegment = url.pathname.split('/')[1] ?? '';
    if (firstPathSegment === 'doporucujeme') {
      requests.push({
        url: inputtedUrl,
        label: Label.Category,
      })
      continue;
    }

    if (firstPathSegment === 'kategorie') {
      requests.push({
        url: inputtedUrl,
        label: Label.Subcategory,
      })
      continue;
    }

    log.warning(`Skipping ${inputtedUrl}, only home-page/category/recommended urls are supported`);
  }

  if (requests.length === 0) {
    log.info('Got no urls on the input, will start from the home page')
    requests.push({
      url: ROOT_URL,
      label: Label.Start
    })
  }

  await crawler.run(requests);
  await stats.save(true);

  if (!development) {
    await uploadToKeboola("allegro-daily-cz");
  }
}

await Actor.main(main, { statusMessage: "DONE" });
