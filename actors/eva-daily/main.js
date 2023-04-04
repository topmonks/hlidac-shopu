import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { parseHTML } from "linkedom/cached";

const HOST = "https://www.eva.cz";

function handlePagination(document, request) {
  const nextPagination = document.querySelectorAll(
    "ul.pagination i.fa-angle-right"
  );
  if (nextPagination.length > 0) {
    const nextFirst = request.userData.first + 36;
    const url = new URL(request.url);
    url.searchParams.set("first", nextFirst.toString());
    url.search = url.searchParams.toString();
    log.info(`${request.url} Found pagination page ${url}`);
    return {
      url: url.toString(),
      userData: {
        label: "PAGE",
        first: nextFirst
      }
    };
  }
}

function parseItem(el, category) {
  // Check if item is unpacked/used
  if (!el.querySelector("div.sgnao2")) {
    const itemUrl = el.querySelector("div.pb-1 h2 a");
    return {
      itemId: itemUrl.getAttribute("href").match(/\/([^zbozi\/]+)\//)?.[1],
      itemName: itemUrl.innerText,
      itemUrl: new URL(itemUrl.getAttribute("href"), HOST).href,
      img: `https:${el.querySelector("img").getAttribute("data-src")}`,
      currentPrice: el
        .querySelector("span.price")
        .innerText.replace(/\s/g, "")
        .trim(),
      originalPrice: null,
      discounted: category.includes("akční nabídka"),
      currency: "CZK",
      inStock: Boolean(
        el
          .querySelector("div.st_onstore")
          ?.innerText?.toLowerCase()
          ?.includes("skladem") ||
          el
            .querySelector("div.st_onstore2")
            ?.innerText?.toLowerCase()
            ?.includes("skladem u dodavatele")
      ),
      category
    };
  }
}

function extractProducts(document) {
  const category = document.querySelector("div#regularcontent h1")?.innerText;
  if (!category) return [];
  const products = document
    .querySelectorAll("#content_list div.zitembox")
    .map(el => parseItem(el, category))
    .filter(Boolean);
  return products;
}

async function saveProducts(products, stats, processedIds) {
  const requests = [];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(Dataset.pushData(product));
      stats.inc("items");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
  await Promise.all(requests);
}

async function main() {
  rollbar.init();
  const input = (await KeyValueStore.getInput()) || {};
  const {
    development = process.env.TEST,
    maxRequestRetries = 3,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full
  } = input;

  const processedIds = new Set();
  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0
  });

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
    // useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 300,
    maxConcurrency: 5, // they have robots detection
    async requestHandler({ request, body, crawler, log, session }) {
      const { document } = parseHTML(body.toString());
      if (request.userData.label === "PAGE") {
        //Check if there is next pagination
        await crawler.requestQueue.addRequest(
          handlePagination(document, request)
        );
        const products = extractProducts(document);
        log.info(`${request.url} Found ${products.length} products`);
        if (!products.length) session.markBad();
        stats.inc("pages");
        await saveProducts(products, stats, processedIds);
      } else if (request.userData.label === "CATEGORY") {
        // Add subcategories if this category has also products
        const subcategories = document
          .querySelectorAll("div#mele div.lmsubmenu div.mlevel a")
          .map(a => ({
            url: `${HOST}${a.getAttribute("href")}`,
            userData: {
              label: "CATEGORY",
              first: 0
            }
          }));
        if (subcategories.length > 0) {
          stats.add("categories", subcategories.length);
          log.info(
            `${request.url} Found ${subcategories.length} subcategories`
          );
          await crawler.requestQueue.addRequests(subcategories, {
            forefront: true
          });
        }

        //Check if there is next pagination
        const requests = handlePagination(document, request);
        if (requests) {
          await crawler.requestQueue.addRequest(requests);
        }
        const products = extractProducts(document);
        log.info(`${request.url} Found ${products.length} products`);
        if (!products.length) session.markBad();
        await saveProducts(products, stats, processedIds);
      } else if (request.userData.label === "START") {
        const links = document
          .querySelectorAll("#mele > div.lmitem > a")
          .map(a => ({
            url: `${HOST}${a.getAttribute("href")}`,
            userData: {
              label: type === "COUNT" ? "COUNT" : "CATEGORY",
              first: 0
            }
          }))
          .filter(
            ({ url }) =>
              !url.includes("novinky") &&
              !url.includes("rozbalene") &&
              !url.includes("vyprodej")
          );
        //If type is COUNT, use category urls for count all products
        stats.add("categories", links.length);
        log.info(`${request.url} Found ${links.length} categories`);
        await crawler.requestQueue.addRequests(links, { forefront: true });
      } else if (request.userData.label === "COUNT") {
        //Not unique items. Can include hidden items,unpacked, used, duplicity listing
        const countElement = document.querySelector(
          "div#content_filter div.fpanel_inside div.float-right"
        );
        if (countElement) {
          const countItems = Number(countElement.innerText);
          stats.add("items", countItems);
          log.info(`${request.url} Counted ${countItems} items`);
        }
      }
    },
    failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  if (type === ActorType.FULL || type === "COUNT") {
    startingRequests.push({
      url: "https://eva.cz",
      userData: {
        label: "START"
      }
    });
  } else if (type === ActorType.TEST) {
    startingRequests.push({
      url: `https://www.eva.cz/oddeleni/mraznicky-pultove/`,
      userData: {
        label: "CATEGORY",
        first: 0
      }
    });
  }
  await crawler.run(startingRequests);

  log.info("crawler finished");

  stats.save(true);
  if (!development && type !== "COUNT") {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "eva.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola("eva_cz");
    log.info("upload to Keboola finished");
  }
}

await Actor.main(main);
