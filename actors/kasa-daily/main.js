import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "linkedom/cached";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const web = "https://www.kasa.cz";
const limit = "limit=96";
const akce = "akce";
const aktuality = "aktuality";
const bazar = "bazar";
const LastCategory = "LAST_CATEGORY";

/**
 * @param {string} availability
 * @returns {boolean}
 */
function parseAvailability(availability) {
  switch (availability) {
    case "not-available":
      return false;
    case "available supplier":
      return false;
    case "date-available":
      return false;
    default:
      return true;
  }
}

function extractItems(products, breadcrums) {
  return products
    .map(item => {
      const result = {};
      const link = item.querySelector(".product-box-link");
      const itemId = link.dataset.productId;
      const isBazar = item
        .querySelectorAll(".labels > .label-red")
        .some(label => label.innerText.trim() === bazar);
      if (parseInt(itemId) > 0 || !isBazar) {
        const name = item
          .querySelector("h2.product-box-title")
          .innerText.trim();
        const itemUrl = link.getAttribute("href");
        const actualPriceSpan = item.querySelector("p.main-price");
        const oldPriceSpan = item.querySelector(
          "div.before-price span.text-strike"
        );
        const itemImgUrl = item.querySelector(".product-box-thumb img");
        result.inStock = parseAvailability(
          item.querySelector("div.availability span").getAttribute("class")
        );
        if (oldPriceSpan) {
          result.originalPrice = parseFloat(
            oldPriceSpan.innerText.replace("Kč", "").replace(" ", "").trim()
          );
          result.currentPrice = parseFloat(
            actualPriceSpan.innerText.replace("Kč", "").replace(" ", "").trim()
          );
          result.discounted = true;
        } else {
          result.currentPrice = parseFloat(
            actualPriceSpan.innerText.replace("Kč", "").replace(" ", "").trim()
          );
          result.originalPrice = null;
          result.discounted = false;
        }
        result.img = itemImgUrl.getAttribute("src");
        result.itemId = itemId;
        result.itemUrl = `${web}${itemUrl}`;
        result.itemName = name;
        result.category = breadcrums.join(" > ");
        return result;
      }
    })
    .filter(Boolean);
}

function handleProducts(document) {
  const breadCrums = document
    .querySelectorAll(".col-main-content-right > ol.breadcrumb > li")
    .map(breadcrumb => breadcrumb.innerText.trim());
  const products = document.querySelectorAll(
    ".product-boxes article.product-box"
  );
  const items = extractItems(products, breadCrums);
  log.info(`Found ${items.length} products`);
  return items;
}

async function saveItems(s3, stats, products) {
  const requests = [Dataset.pushData(products)];
  stats.add("items", products.length);
  for (const s3item of products) {
    requests.push(uploadToS3v2(s3, s3item, { priceCurrency: "CZK" }));
  }
  return Promise.all(requests);
}

function handleCategories(categories) {
  const subCategories = [];
  const lastCategories = [];
  categories.forEach(category => {
    const link = category.querySelector("a");
    const href = link.getAttribute("href");
    const menuItemId = category.getAttribute("id");
    if (category.classList.contains("last-category")) {
      lastCategories.push({
        url: `${web}${href}?${limit}`,
        userData: {
          label: LastCategory
        }
      });
    } else {
      subCategories.push({
        url: `${web}${href}`,
        userData: {
          label: "SUB_CATEGORY",
          categoryMenuId: menuItemId
        }
      });
    }
  });
  log.info(`Found ${subCategories.length} subCategories.`);
  log.info(`Found ${lastCategories.length} lastCategories.`);
  return subCategories.concat(lastCategories);
}

async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = (await KeyValueStore.getInput()) || {};
  const {
    development = process.env.TEST,
    maxRequestRetries = 2,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full
  } = input;

  const stats = await withPersistedStats(
    x => x,
    (await KeyValueStore.getValue("STATS")) || {
      pages: 0,
      items: 0
    }
  );

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 400,
    async requestHandler({ crawler, body, request }) {
      stats.inc("pages");
      const { document } = parseHTML(body.toString());
      if (request.userData.label === "START") {
        log.info("START scrapping Kasa.cz");
        const mainCategories = document
          .querySelectorAll(
            ".main-content .col-sidebar-left ul.main-menu-nav > li > a"
          )
          .map(link => {
            const href = link.getAttribute("href");
            if (!href.includes(akce) && !href.includes(aktuality)) {
              return {
                url: `${web}${href}`,
                userData: {
                  label: "MAIN_CATEGORY"
                }
              };
            }
          })
          .filter(Boolean);
        log.info(`Found ${mainCategories.length} mainCategories.`);
        await crawler.requestQueue.addRequests(mainCategories);
      } else if (request.userData.label === "MAIN_CATEGORY") {
        log.info(`START with main category ${request.url}`);
        const categories = document.querySelectorAll(
          "ul.sidebar-menu-tree > li:not(.is-extra)"
        );
        const requests = handleCategories(categories);
        await crawler.requestQueue.addRequests(requests);
      } else if (request.userData.label === "SUB_CATEGORY") {
        log.info(`START with sub category ${request.url}`);
        const items = document.querySelectorAll(
          `#${request.userData.categoryMenuId} > ul > li:not(.is-extra)`
        );
        const requests = handleCategories(items);
        await crawler.requestQueue.addRequests(requests);
      } else if (request.userData.label === LastCategory) {
        log.info(`START with last category ${request.url}`);
        const maxPage =
          document.querySelectorAll(".pagination .pg_button").at(-1)
            ?.innerText ?? 0;
        const products = handleProducts(document);
        await saveItems(s3, stats, products);
        if (maxPage !== 0) {
          const pagiPages = [];
          for (let i = 2; i <= maxPage; i++) {
            pagiPages.push({
              url: `${request.url}&strana=${i}`,
              userData: {
                label: "LAST_CATEGORY_PAGE"
              }
            });
          }
          console.info(`Found ${pagiPages.length} category pages`);
          await crawler.requestQueue.addRequests(pagiPages);
        }
      } else if (request.userData.label === "LAST_CATEGORY_PAGE") {
        log.info(`START with page ${request.url}`);
        const products = handleProducts(document);
        await saveItems(s3, stats, products);
      } else if (request.userData.label === ActorType.BlackFriday) {
        log.info(`START BF ${request.url}`);
        const categories = document
          .querySelectorAll(".html_obsah .wsw > div > a")
          .map(a => {
            if (!a.getAttribute("href").includes("doprava")) {
              return {
                url: `${web}${a.getAttribute("href")}?${limit}`,
                userData: {
                  label: "LAST_CATEGORY"
                }
              };
            }
          })
          .filter(Boolean);
        log.info(`Found ${categories.length} BF categories`);
        await crawler.requestQueue.addRequests(categories);
      }
    },
    failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  if (type === ActorType.BlackFriday) {
    startingRequests.push({
      url: "https://www.kasa.cz/black-friday",
      userData: {
        label: ActorType.BlackFriday
      }
    });
  } else if (type === ActorType.Full) {
    startingRequests.push({
      url: web,
      userData: {
        label: "START"
      }
    });
  }
  log.info("Starting the crawl.");
  await crawler.run(startingRequests);
  log.info("Crawl finished.");

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "kasa.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola(type !== ActorType.Full ? "kasa_bf" : "kasacz");
    log.info("upload to Keboola finished");
  }

  console.log("Finished.");
}

await Actor.main(main);
