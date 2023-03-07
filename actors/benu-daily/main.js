import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { Actor, Dataset, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { parseHTML } from "linkedom/cached";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

/** @typedef {import("linkedom/types/interface/document").Document} Document */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

/** @enum {string} */
const Labels = {
  START: "START",
  HOME: "HOME",
  PAGE: "PAGE",
  DETAIL: "DETAIL",
  CATEGORY: "CATEGORY",
  PAGI_PAGE: "PAGI_PAGE"
};
const web = "https://www.benu.cz";

/**
 * @param {Document} document
 * @returns {string | null}
 */
function findSUKL(document) {
  const rows = document.querySelectorAll(".info-table tr");
  for (const row of rows) {
    const key = row.querySelector("th").innerText;
    if (key.includes("SUKL")) {
      return row.querySelector("td").innerText;
    }
  }
  return null;
}

/**
 * @param {Document} document
 * @returns {Product | null}
 */
function extractProduct(document) {
  const script = document
    .querySelector("#snippet-productRichSnippet-richSnippet")
    .textContent.trim();
  const jsonData = JSON.parse(script);
  const itemId = jsonData.identifier; // can have several identical IDs and differ only in the URL
  const itemUrl = jsonData.url;
  if (!itemId || !itemUrl) return null;
  const { offers } = jsonData;
  const currentPrice = offers.price;
  const originalPriceEl = document.querySelector(
    "#product-detail .buy-box__price-head del"
  );
  const originalPrice = originalPriceEl
    ? parseFloat(
        originalPriceEl.innerText.replace("Kč", "").replace(/\s/g, "").trim()
      )
    : null;
  return {
    itemId,
    itemName: jsonData.name,
    itemUrl,
    img: jsonData.image,
    currentPrice,
    identifierSUKL: findSUKL(document),
    originalPrice: originalPrice ? originalPrice : null,
    url: jsonData.url,
    category: document
      .querySelectorAll("ol#breadcrumb > li > a")
      .map(a => a.innerText),
    discounted: originalPrice ? currentPrice < originalPrice : false
  };
}

/**
 * @param {Document} document
 * @returns {{ url: string, userData: { label: Labels } }[]}
 */
function productListingRequests(document) {
  const productsOnPage = document
    .querySelectorAll("ul.products > li div.spc a.detail")
    .map(product => {
      const spc = product.getAttribute("href");
      const url = `${web}${spc}`;
      return {
        url,
        userData: {
          label: Labels.DETAIL
        }
      };
    });
  log.info(`Found ${productsOnPage.length} products`);
  return productsOnPage;
}

/**
 * @param {ActorType} type
 * @param {Stats} stats
 */
function startingRequests(type, stats) {
  const startingRequests = [];
  switch (type) {
    case ActorType.BlackFriday:
      startingRequests.push({
        url: "https://www.benu.cz/black-friday",
        userData: {
          label: Labels.PAGE
        }
      });
      stats.inc("categories");
      break;
    case ActorType.Test:
      startingRequests.push({
        url: "https://www.benu.cz/alavis-maxima-triple-blend-extra-silny-700-g",
        userData: {
          label: Labels.DETAIL
        }
      });
      break;
    default:
      startingRequests.push({
        url: web,
        userData: {
          label: Labels.START
        }
      });
      break;
  }
  return startingRequests;
}

async function main() {
  rollbar.init();

  const {
    development,
    maxRequestRetries,
    proxyGroups,
    type = ActorType.Full
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    urls: 0,
    pages: 0,
    items: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestRetries,
    maxRequestsPerMinute: 400,
    proxyConfiguration,
    async requestHandler({ body, request, crawler }) {
      const { document } = parseHTML(body.toString());
      switch (request.userData.label) {
        case Labels.START:
          {
            log.info("START scraping benu.cz");
            let categories = document.querySelectorAll(
              "div.main-menu__submenu li > a"
            );
            if (type === ActorType.Test) {
              log.info("type === TEST");
              categories = categories.slice(0, 1);
            }
            // Use flatMap to remove invalid categories
            const allCategories = categories
              .map(category => {
                const link = category.getAttribute("href");
                if (link === "#" || link === "/") return;
                const url = link.includes("https") ? link : `${web}${link}`;
                return {
                  url,
                  userData: {
                    label: Labels.PAGE,
                    mainCategory: category.innerText.trim()
                  }
                };
              })
              .filter(Boolean);
            log.info(`Found ${allCategories.length} allCategories.`);
            stats.add("categories", allCategories.length);
            await crawler.requestQueue.addRequests(allCategories, {
              forefront: true
            });
          }
          break;
        case Labels.PAGE:
          {
            log.info(`START with page ${request.url}`);
            const maxPage =
              document
                .querySelectorAll("p.paging a:not(.next):not(.ico-arr-right)")
                .at(-1)
                ?.innerText?.trim() ?? 0;
            const requests = productListingRequests(document);
            await crawler.requestQueue.addRequests(requests);
            if (maxPage !== 0) {
              const paginationPage = [];
              for (let i = 2; i <= maxPage; i++) {
                paginationPage.push({
                  url: `${request.url}?page=${i}`,
                  userData: {
                    label: Labels.PAGI_PAGE,
                    mainCategory: request.userData.mainCategory,
                    category: request.userData.category
                  }
                });
              }
              log.info(`Found ${paginationPage.length} pages in category.`);
              stats.add("pages", paginationPage.length);
              await crawler.requestQueue.addRequests(paginationPage, {
                forefront: true
              });
            }
          }
          break;
        case Labels.PAGI_PAGE:
          {
            log.info(`START with page ${request.url}`);
            const requests = productListingRequests(document);
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Labels.DETAIL:
          {
            log.info(`START with product ${request.url}`);
            const result = extractProduct(document);
            if (result) {
              await Dataset.pushData(result);
              stats.inc("items");
            }
            log.info(`END with product ${request.url}`);
          }
          break;
      }
      stats.inc("urls");
    },
    failedRequestHandler({ request, log }, error) {
      log.error(
        `Request ${request.url} failed ${request.retryCount} times`,
        error
      );
      stats.inc("failed");
    }
  });

  await crawler.run(startingRequests(type, stats));
  log.info("crawler finished");

  await Promise.all([
    stats.save(true),
    uploadToKeboola(type === ActorType.BlackFriday ? "benu_cz_bf" : "benu_cz")
  ]);
}

await Actor.main(main, { statusMessage: "DONE" });
