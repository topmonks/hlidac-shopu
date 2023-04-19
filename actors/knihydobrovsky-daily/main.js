import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  cleanPrice,
  saveUniqProducts
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, log } from "apify";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { HttpCrawler, useState } from "@crawlee/http";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

const canonicalUrl = x => new URL(x, "https://www.knihydobrovsky.cz");
const canonical = x => canonicalUrl(x).href;

/**
 * @param {Document} document
 */
function handleStart(document) {
  return document
    .querySelectorAll("#main div.row-main li a")
    .map(a => a.href)
    .filter(
      x =>
        !x.includes("magnesia-litera") &&
        !x.includes("velky-knizni-ctvrtek") &&
        !x.includes("knihomanie")
    )
    .map(link => ({
      url: canonical(link),
      userData: { label: "SUBLIST" }
    }));
}

/**
 * @param {Document} document
 */
function extractProducts(document) {
  return document
    .querySelectorAll("li[data-productinfo]")
    .map(item => {
      const originalPrice =
        cleanPrice(
          item.querySelector(".price-wrap .price-strike")?.innerText
        ) || null;
      return {
        itemId:
          item
            .querySelector("h3 a")
            .getAttribute("href")
            .match(/-(\d+)$/)?.[1] ??
          canonicalUrl(
            item.querySelector("a.buy-now")?.getAttribute("data-link")
          )?.searchParams?.get("categoryBookList-itemPreview-productId"),
        itemUrl: canonical(item.querySelector("h3 a").getAttribute("href")),
        itemName: item.querySelector("span.name").innerText,
        img: item.querySelector("picture img").getAttribute("src"),
        currentPrice:
          cleanPrice(item.querySelector("p.price strong")?.innerText) || null,
        originalPrice,
        discounted: Boolean(originalPrice),
        rating: parseFloat(
          item
            .querySelector("span.stars.small span")
            .getAttribute("style")
            .split("width: ")[1]
        ),
        currency: "CZK",
        inStock:
          item.querySelector("a.buy-now")?.innerText?.includes("Do košíku") ??
          false,
        category: "",
        breadCrumbs: ""
      };
    })
    .filter(x => x.itemId);
}

async function main() {
  rollbar.init();
  const processedIds = await useState("processedIds", {});

  const {
    development,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full,
    bfUrls = []
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    failed: 0
  });

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    maxRequestsPerMinute: 600,
    async requestHandler({ request, body, crawler }) {
      const {
        url,
        userData: { label }
      } = request;
      const { document } = parseHTML(body.toString());
      log.info("Processing", { url, label });
      switch (label) {
        case "LIST":
          const nextPageHref = document
            .querySelector("nav.paging a.btn-icon-after")
            ?.getAttribute("href");
          if (nextPageHref) {
            const url = canonicalUrl(nextPageHref.trim());
            const pageNumber = url.searchParams.get("currentPage");
            url.searchParams.set("offsetPage", pageNumber);
            log.info(`Adding pagination page ${url.href}`);
            stats.inc("pages");
            await crawler.requestQueue.addRequest(
              {
                url: url.href,
                userData: { label: "LIST" }
              },
              { forefront: true }
            );
          } else {
            log.info("category finish", { url: request.url });
          }
          const products = extractProducts(document);
          log.info(`${request.url} Found ${products.length} products`);
          await saveUniqProducts({ stats, products, processedIds });
          break;
        case "SUBLIST":
          stats.inc("pages");
          log.info(
            `Adding pagination page ${request.url}?sort=2&currentPage=1`
          );
          await crawler.requestQueue.addRequest(
            {
              url: `${request.url}?sort=2&currentPage=1`,
              userData: { label: "LIST" }
            },
            { forefront: true }
          );
          break;
        default: {
          const requests = handleStart(document);
          log.info(`Found ${requests.length} categories from start`);
          stats.add("categories", requests.length);
          await crawler.requestQueue.addRequests(requests);
        }
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startingRequests = [];
  if (type === ActorType.Full) {
    startingRequests.push({
      url: "https://www.knihydobrovsky.cz/kategorie"
    });
    const requestList = [
      "https://www.knihydobrovsky.cz/e-knihy",
      "https://www.knihydobrovsky.cz/audioknihy",
      "https://www.knihydobrovsky.cz/hry",
      "https://www.knihydobrovsky.cz/papirnictvi",
      "https://www.knihydobrovsky.cz/darky"
    ];
    for (const list of requestList) {
      startingRequests.push({
        url: list,
        userData: {
          label: "SUBLIST"
        }
      });
    }
  } else if (type === ActorType.BlackFriday) {
    //startingRequests.push({
    //  url: "https://www.knihydobrovsky.cz/akce-a-slevy/detail/black-friday-prave-dnes"
    //});
    for (const url of bfUrls) {
      startingRequests.push({
        url,
        userData: {
          label: "SUBLIST"
        }
      });
    }
  } else if (type === ActorType.Test) {
    startingRequests.push({
      url: "https://www.knihydobrovsky.cz/detektivky-thrillery-a-horor?sort=2&currentPage=130",
      userData: {
        label: "LIST"
      }
    });
  }
  log.info("Starting the crawl.");
  await crawler.run(startingRequests);
  log.info("Crawl finished.");

  await stats.save(true);

  if (!development) {
    try {
      await uploadToKeboola(
        type === ActorType.BlackFriday
          ? "knihydobrovsky_cz_bf"
          : "knihydobrovsky_cz"
      );
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
}

await Actor.main(main);
