import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, LogLevel, log } from "apify";
import { PlaywrightCrawler, useState } from "@crawlee/playwright";
import { changeListingUrlPage, listingApiUrl, parseItems } from "./listing.js";

async function main() {
  rollbar.init();
  const processedIds = await useState("processedIds", {});

  const {
    development,
    debug,
    test,
    maxRequestRetries,
    // browser pages in parallel: unlimited, Crawlee scales to ~50 on one CPU, pages time out and get lost
    maxConcurrency = 10,
    type = ActorType.Full,
    bfUrl = "https://www.tetadrogerie.cz/eshop/produkty/stitky-entilos-black-friday"
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats({
    categories: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    useApifyProxy: !development
  });

  const crawler = new PlaywrightCrawler({
    autoscaledPoolOptions: {
      autoscaleIntervalSecs: 5
    },
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    navigationTimeoutSecs: 30,
    useSessionPool: true,
    persistCookiesPerSession: true,
    preNavigationHooks: [
      async ({ blockRequests }) => {
        await blockRequests(); // block images, stylesheets, etc.
      }
    ],
    async requestHandler({ request, page }) {
      let { label, initial } = request.userData;

      log.info("Processing page", { url: request.url, label });

      await page.waitForLoadState("load");

      switch (label) {
        case "START":
          const initialCategoryUrls = await page.$$eval(".c-main-menu .c-menu-item__link-wrapper > a", links => {
            return [...links].map(link => link.href);
          });

          const initialCategoryRequests = initialCategoryUrls.map(url => ({
            url,
            userData: {
              initial: true // to generate pagination requests for the initial categories only once
            }
          }));

          stats.add("categories", initialCategoryRequests.length);
          await crawler.requestQueue.addRequests(initialCategoryRequests);
        default: // any category overview page
          // category (`/eshop/produkty/<taxon>`) or promotion (`/akce/detail/<action>`) listing
          const fetchApiUrl = listingApiUrl(request.url);
          if (fetchApiUrl) {
            const json = await page.evaluate(
              async ({ fetchApiUrl }) => {
                return await fetch(fetchApiUrl).then(res => res.json());
              },
              { fetchApiUrl }
            );

            if (json.message) {
              log.warning(`problem during processing: ${request.url}`);
              throw new Error(json.message);
            }

            log.info(`Pagination info for slug: ${request.url}`, json.pagination);

            if (initial) {
              // resolve pagination
              const paginationUrls = [];
              for (let page = 1; page <= json.pagination.lastPage; page++) {
                const url = changeListingUrlPage(request.url, page);
                paginationUrls.push({ url });
              }
              await crawler.requestQueue.addRequests(paginationUrls);
            }

            const products = parseItems(json);

            await saveUniqProducts({
              products,
              stats,
              processedIds
            });
          }
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startingRequests = [];
  if (development && test) {
    startingRequests.push({
      url: "https://www.tetadrogerie.cz/eshop/produkty/hubeni-hmyzu",
      userData: {
        initial: true
      }
    });
  } else if (type === ActorType.BlackFriday) {
    startingRequests.push({
      url: bfUrl,
      userData: {
        initial: true
      }
    });
  } else {
    startingRequests.push({
      url: `https://www.tetadrogerie.cz/eshop/`,
      userData: {
        label: "START",
        initial: true
      }
    });
  }
  await crawler.run(startingRequests);

  await stats.save(true);
  // e.g. a `bfUrl` that is not a listing: fail instead of uploading an empty table (#3678)
  if (!Object.keys(processedIds).length) {
    throw new Error("No products scraped - not a product listing, blocked or site structure changed");
  }

  if (!development) {
    let tableName = "teta_cz";
    if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
    log.info("invalidated Data CDN");
  }
  log.info("Finished.");
}

await Actor.main(main);
