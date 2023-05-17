import { getInput } from "../common/crawler.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset } from "apify";
import { parseHTML } from "linkedom";
import { useState } from "@crawlee/core";
import { PlaywrightCrawler } from "@crawlee/playwright";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Label = {
  Start: "Start",
  Product: "Product",
  Category: "Category"
};

function extractProduct({ document, request }) {
  const prices = document.querySelectorAll("meta[itemprop=price]");
  console.assert(
    prices.length === 1,
    `multiple prices found on ${request.url}`
  );
  const currentPrice = cleanPrice(prices[0].content);
  const originalPrice = cleanPrice(
    document.querySelector(
      '[data-role="app-container"] [style="text-decoration:line-through"]'
    )?.textContent
  );
  return {
    itemId: document.querySelector("meta[itemprop=sku]").content,
    itemName: document.querySelector("meta[itemprop=name]").content,
    itemUrl: document.querySelector("meta[itemprop=url]").content,
    img: document.querySelector("meta[itemprop=image]").content,
    currentPrice,
    inStock: !!currentPrice,
    originalPrice,
    discounted: !!originalPrice,
    currency: document.querySelector("meta[itemprop=priceCurrency]").content,
    breadcrumbs: Array.from(
      document.querySelectorAll(
        '[itemtype="http://schema.org/BreadcrumbList"] li'
      )
    )
      .slice(1)
      .map(li => li.textContent.trim())
      .join(" > ")
  };
}

async function main() {
  const rollbar = Rollbar.init();

  const { development, proxyGroups } = await getInput();

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    products: 0,
    errors: 0,
    failed: 0
  });

  const requestedProducts = useState("requestedProducts", {});

  const crawler = new PlaywrightCrawler({
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    maxConcurrency: 3,
    maxRequestsPerMinute: 200,
    browserPoolOptions: {
      useFingerprints: true,
      fingerprintOptions: {
        fingerprintGeneratorOptions: { locales: ["cs-CZ"] }
      }
    },
    async requestHandler({ request, page, log, crawler }) {
      const { label } = request.userData;
      log.info(`Processing ${request.url} (${label})`);

      switch (label) {
        case Label.Start:
          {
            await page.click('[data-role="accept-consent"]');
            await page.click(
              '[data-role="header-secondary-bar"] [data-dropdown-id="categories_dropdown"] button'
            );
            await page.waitForSelector(
              ".js-navigation-links a[href*=kategorie]"
            );
            const requests = (
              await page
                .locator(".js-navigation-links a[href*=kategorie]")
                .evaluateAll(categories => categories.map(a => a.href))
            ).map(url => ({
              url,
              userData: {
                label: Label.Category
              }
            }));
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Label.Category:
          {
            const content = await page.content();
            const { document } = parseHTML(content);
            stats.inc("categories");
            const next = document.querySelector("[rel=next]");
            if (next) {
              await crawler.requestQueue.addRequest(
                {
                  url: next.href,
                  userData: {
                    label: Label.Category
                  }
                },
                { forefront: true }
              );
            }

            const urls = Array.from(
              document.querySelectorAll("article h2 a"),
              a => a.href
            );
            const requests = [];
            for (const url of urls) {
              if (requestedProducts[url]) continue;
              requestedProducts[url] = true;
              requests.push({
                url,
                userData: {
                  label: Label.Product
                }
              });
            }
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Label.Product:
          const content = await page.content();
          const { document } = parseHTML(content);
          const product = extractProduct({ document, request });
          stats.inc("products");
          await Dataset.pushData(product);
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

  await crawler.run([
    {
      url: "https://allegro.cz",
      userData: {
        label: Label.Start
      }
    }
  ]);
  await stats.save(true);

  if (!development) {
    // await uploadToKeboola("allegro-daily-cz");
  }
}

await Actor.main(main, { statusMessage: "DONE" });
