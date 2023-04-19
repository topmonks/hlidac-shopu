import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, KeyValueStore, log, LogLevel } from "apify";
import { HttpCrawler, useState } from "@crawlee/http";
import {
  cleanPriceText,
  cleanUnitPriceText
} from "@hlidac-shopu/actors-common/product.js";
import { URL } from "url";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";

const rootUrl = "https://shop.iglobus.cz";

/** @enum {string} */
const Labels = {
  START: "START",
  LIST: "LIST",
  COUNT: "COUNT"
};

/** @enum {string} */
const Stores = {
  ZLI: "ZLI",
  OST: "OST"
};

function extractItems(document, category) {
  return document
    .querySelectorAll(".product-list product-item")
    .map(product => {
      const result = { inStock: true };
      result.itemId = product
        .querySelector(".add-to-cart-btn a")
        .getAttribute("data-product-id");
      result.itemName = product
        .querySelector("div.product-item__info > a")
        .innerText.trim();
      result.itemUrl = extractProductUrl(
        product
          .querySelector("div.product-item__info > a")
          .getAttribute("onclick")
      );
      result.img = product.querySelector(".image-link img").getAttribute("src");

      result.currentPrice = parseFloat(
        cleanPriceText(
          product
            .querySelector(".money-price > span:last-child")
            .innerText.trim()
        )
      );
      const originalPrice = product
        .querySelector(".money-price__amount--original")
        ?.innerText?.trim();
      result.originalPrice = originalPrice
        ? parseFloat(cleanPriceText(originalPrice))
        : null;
      result.currentUnitPrice = parseFloat(
        cleanUnitPriceText(
          product.querySelector(".product-item__sale-volume").innerText.trim()
        )
      );
      result.useUnitPrice = product
        .querySelector(".product-item__info")
        .innerText.includes("cca");
      result.discounted = result.currentPrice < result.originalPrice;
      result.currency = "CZK";
      result.category = category;
      return result;
    });
}

function extractProductUrl(onclickAttr) {
  if (!onclickAttr) return null;
  const regexp = /\'(\S+)\'/m;
  const match = regexp.exec(onclickAttr);
  return `${rootUrl}${match[1]}`;
}

async function main() {
  rollbar.init();
  const {
    development,
    maxRequestRetries,
    proxyGroups,
    store = Stores.ZLI,
    type = ActorType.Full
  } = await getInput();

  const processedIds = await useState("processedIds", {});
  const stats = await withPersistedStats(
    x => x,
    (await KeyValueStore.getValue("STATS")) || {
      categories: 0,
      pages: 0,
      items: 0,
      itemsDuplicity: 0,
      countItems: 0
    }
  );

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 600,
    async requestHandler({ crawler, request, body }) {
      const { document } = parseHTML(body.toString());
      const { url, userData } = request;
      const { label, category } = userData;
      log.info("Page opened.", { label, category, url });
      switch (label) {
        case Labels.START:
          if (type === ActorType.Count) {
            const requests = document
              .querySelectorAll(
                "a.navigation-multilevel-node__link-inner--lvl-2"
              )
              .map(countLink => {
                const url = new URL(countLink.getAttribute("href"), rootUrl);
                if (!url.toString().includes("novinky")) {
                  return {
                    url: `${url.href}`,
                    userData: {
                      label: Labels.COUNT,
                      category: countLink.innerText.trim()
                    }
                  };
                }
              });
            await crawler.requestQueue.addRequests(requests);
          } else {
            const requests = document
              .querySelectorAll(
                ".menu > li.filter-category__item--level-2 > button.filter-category__link, " +
                  ".menu > li.filter-category__item--level-2 > div > div > button.filter-category__link, " +
                  ".menu > li.filter-category__item--level-3 > button.filter-category__link, " +
                  ".menu > li.filter-category__item--level-3 > div > div > button.filter-category__link"
              )
              .map(link => {
                const url = new URL(link.getAttribute("data-url"), rootUrl);
                return {
                  url: `${url.href}`,
                  userData: {
                    label: Labels.LIST,
                    page: 0,
                    category: link.innerText.trim()
                  }
                };
              });
            stats.add("categories", requests.length);
            log.info(`Found ${requests.length}x categories`);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Labels.LIST:
          stats.inc("pages");
          if (userData.page === 0) {
            const lastPageLink =
              document
                .querySelectorAll(
                  ".pagination .pagination__step-cz:not(.pagination__step--next-cz)"
                )
                .at(-1)
                ?.getAttribute("href") ?? "";

            const paginationLink = new URL(lastPageLink, rootUrl);
            const pagesTotal = paginationLink.searchParams.get("page");
            const requests = restPageUrls(pagesTotal, i => {
              paginationLink.searchParams.set("page", i.toString());
              userData.page = i;
              return {
                url: paginationLink.href,
                userData
              };
            });
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }

          const products = extractItems(document, userData.category);
          log.info(`Found ${products.length} products`);
          await saveUniqProducts({ products, stats, processedIds });
          break;
        case Labels.COUNT:
          const count = document("span.category-number-of-products")
            .innerText.trim()
            .match(/\d+/)[0];
          stats.add("countItems", Number(count));
          log.info(
            `Found ${count} items in category ${request.userData.category}`
          );
          break;
        default:
          log.error(`Unknown label ${label}`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  if (type === ActorType.Full) {
    startingRequests.push({
      url: `${rootUrl}/store/switch?store=${store}&referer-url=/cs/outlet`,
      userData: { label: Labels.START }
    });
  } else if (type === ActorType.Test) {
    startingRequests.push({
      url: `https://shop.iglobus.cz/cs/sv%C4%9Bt-d%C4%9Bt%C3%AD/d%C4%9Btsk%C3%A1-v%C3%BD%C5%BEiva/p%C5%99%C3%ADkrmy/ovocn%C3%A9`,
      userData: {
        label: Labels.LIST,
        page: 0,
        category: "Ovocné"
      }
    });
  }
  log.info("Starting the crawl.");
  await crawler.run(startingRequests);
  log.info("Crawl finished.");
  stats.save(true);
  log.debug("STATS saved!");

  if (!development) {
    await uploadToKeboola("globus_cz");
    log.info("upload to Keboola finished");
  }
  log.info("Finished.");
}

await Actor.main(main);
