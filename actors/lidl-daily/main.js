import { setTimeout as sleep } from "node:timers/promises";
import { HttpCrawler } from "@crawlee/http";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @enum {string} */
const Labels = {
  MAIN_NABIDKA: "MAIN_NABIDKA",
  MAIN_NABIDKA_CAT: "MAIN_NABIDKA_CAT",
  DETAIL: "DETAIL",
  LIDL_SHOP: "LIDL_SHOP",
  LIDL_SHOP_MAIN_CAT: "LIDL_SHOP_MAIN_CAT",
  LIDL_SHOP_CAT: "LIDL_SHOP_CAT",
  LIDL_SHOP_DETAIL: "LIDL_SHOP_DETAIL",
  LIDL_SHOP_SECTION: "LIDL_SHOP_SECTION"
};
const shopUrl = "https://www.lidl.cz";

function createInitRequests({ type, urls }) {
  const sources = [];
  if (type === ActorType.BlackFriday) {
    return [
      {
        url: urls?.length ? urls[0] : "https://www.lidl.cz/c/black-friday/a10034046",
        userData: {
          label: Labels.LIDL_SHOP_CAT,
          level: 1
        }
      }
    ];
  }
  /*sources.push({
    url: "https://www.lidl.cz/aktualni-nabidka",
    userData: {
      label: LABELS.MAIN_NABIDKA
    }
  });
  sources.push({
    url: "https://www.lidl.cz/cerstve-produkty",
    userData: {
      label: LABELS.MAIN_NABIDKA
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/kategorie/s10004543",
    userData: {
      label: LABELS.LIDL_SHOP
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/hity-tydne/a10004407",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/q/query/Slevy?pageId=20029807",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/p/hn8schlafsysteme-7zonova-tastickova-matrace-xxl-gelstar-t-1000/p100241432",
    userData: {
      label: LABELS.LIDL_SHOP_DETAIL
    }
  });*/
  sources.push({
    url: "https://www.lidl.cz/q/query/Slevy?offset=0&sort=Price-asc",
    userData: {
      label: Labels.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/kategorie/s10004543",
    userData: {
      label: Labels.LIDL_SHOP_SECTION,
      level: 1
    }
  });
  return sources;
}

function getItemId(url) {
  const arr = url.split("/");
  return arr[arr.length - 1];
}

function getBaseProducts(document) {
  return document.querySelectorAll("article.product").map(article => {
    const title = article.querySelector("h3").innerText.trim();
    const mainFrame = article.querySelector("a.product__body");
    const itemUrl = mainFrame.getAttribute("href");
    const imageSource = mainFrame.querySelectorAll("picture source")[0];
    const imageLargeArr = imageSource.getAttribute("data-srcset").split(",");
    const result = {
      itemId: getItemId(itemUrl),
      itemUrl: `${shopUrl}${itemUrl}`,
      itemName: title,
      currency: "CZK",
      img: imageLargeArr[0],
      currentPrice: parseFloat(article.querySelector(".pricebox__price").innerText.trim()),
      originalPrice: null,
      discounted: false
    };
    const price = article.querySelector(".pricebox__recommended-retail-price").innerText.trim();
    if (price) {
      result.discounted = true;
      result.originalPrice = parseFloat(price);
    }
    return result;
  });
}

function mainMenuRequests(document) {
  log.info("Start scrapeMainMenu");
  const subMenu = document.querySelectorAll("a.theme__item");
  log.debug(`Found ${subMenu.length} subcategories`);
  return subMenu.map(m => ({
    url: `${shopUrl}${m.getAttribute("href")}`,
    userData: {
      label: Labels.MAIN_NABIDKA_CAT
    }
  }));
}

function mainMenuCategoryRequests(document) {
  const products = getBaseProducts(document);
  return products.map(product => ({
    url: product.itemUrl,
    userData: {
      label: Labels.DETAIL,
      product
    }
  }));
}

function scrapeDetail({ request, document }) {
  const {
    userData: { product }
  } = request;
  let breadcrumbs = document.querySelectorAll(".breadcrumbs__items-container .breadcrumbs__text");
  if (product) {
    breadcrumbs = breadcrumbs.slice(0, breadcrumbs.length - 1);
    product.category = breadcrumbs.map(b => b.innerText.trim()).join(" > ");
    return product;
  }
}

function mainNavigationRequests(document) {
  const mainMenu = document.querySelectorAll("ol.n-header__main-navigation--sub a.n-header__main-navigation-link");
  return mainMenu.map(menu => ({
    url: `https://www.lidl.cz${menu.getAttribute("href")}`,
    userData: {
      label: Labels.LIDL_SHOP_MAIN_CAT,
      level: 1
    }
  }));
}

function categoryRequests(document, level, cats, catLevel, requests = []) {
  for (const c of cats) {
    const name = document.querySelector("div > a, > span");
    const isSelected = name.classList.contains("s-anchor--selected");
    const subCats = c.querySelectorAll("ul > li");
    if (isSelected && subCats.length > 0) {
      categoryRequests(document, level, subCats, catLevel + 1, requests);
    } else if (!isSelected && subCats.length === 0 && catLevel > level) {
      log.info(`enqueue category: ${name.innerText.trim()}`);
      requests.push({
        url: `https://www.lidl.cz${c.querySelector("a").getAttribute("href")}`,
        userData: {
          label: catLevel < 2 ? Labels.LIDL_SHOP_MAIN_CAT : Labels.LIDL_SHOP_CAT,
          level: catLevel
        }
      });
    }
  }
  return requests;
}

function scrapeShopMainCategory({ document, request }) {
  const { level } = request.userData;
  const cats = document.querySelectorAll("#category > ul > li");
  return categoryRequests(document, level, cats, 0);
}

function shopSectionRequests({ document, request }, { stats }) {
  const requests = [];
  const { level } = request.userData;
  const sections = document.querySelectorAll(
    ".APageRoot__Sections .ATheContentPageCardList__Item a.ATheContentPageCardList__Item--linked"
  );
  for (const section of sections) {
    const a = section.getAttribute("href");
    if (level === 1) {
      requests.push({
        url: a,
        userData: {
          label: Labels.LIDL_SHOP_SECTION,
          level: 2
        }
      });
    } else if (level === 2) {
      requests.push({
        url: a,
        userData: {
          label: Labels.LIDL_SHOP_CAT
        }
      });

      stats.inc("categories");
    }
  }
  log.info(`Found ${sections.length}x categories in ${request.url}`);
  return requests;
}

const from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆĞÍÌÎÏİŇÑÓÖÒÔÕØŘŔŠŞŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇğíìîïıňñóöòôõøðřŕšşťúůüùûýÿžþÞĐđßÆa·/_,:;";
const to = "AAAAAACCCDEEEEEEEEGIIIIINNOOOOOORRSSTUUUUUYYZaaaaaacccdeeeeeeeegiiiiinnooooooorrsstuuuuuyyzbBDdBAa------";

function slug(str) {
  let str_ = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-")
    .replace(/^\s+|\s+$/g, "")
    .toLowerCase();

  // remove accents, swap ñ for n, etc
  for (let i = 0, l = from.length; i < l; i++) {
    str_ = str_.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  return str_
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes
}

// TODO: extract common getters
function extractBlackFridayProducts({ document, url }, { stats, processedIds }) {
  stats.inc("categories");
  const items = [];
  const products = document.querySelectorAll('[selector="PRODUCT"]');
  for (const el of products) {
    stats.inc("items");

    const data = JSON.parse(decodeURIComponent(el.dataset.gridboxImpression));
    const {id:itemId, price:currentPrice, name: itemName, availability,  category} = data;

    const itemUrl = new URL(el.querySelector('.ods-tile__link').getAttribute("href"), 'https://www.lidl.cz/').href ;
    const img = el.querySelector('[selector="PRODUCT"] .ods-image-gallery__item--active .ods-image-gallery__image').getAttribute('src');
    const originalPrice = Number(el.querySelector('.m-price__rrp')?.innerText.replace(' Kč', '').replace(',', '.')) || undefined

    if (processedIds.has(data.id)) {
      stats.inc("itemsDuplicity");
      continue;
    }
    processedIds.add(itemId);
    stats.inc("itemsUnique");
    items.push({
      itemId,
      itemUrl,
      itemName,
      currency: "CZK",
      currentPrice,
      img,
      originalPrice,
      discounted: originalPrice ? originalPrice > currentPrice : false,
      inStock: !availability.includes('not_'), // "available" or "not_available"
      category: category.split("/").slice(1).join(" > "),
      slug: itemId
    });
  }
  return items;
}

function extractProducts({ document, stats, processedIds, log, url }) {
  const products = document.querySelectorAll("#s-results .s-grid__item:not(.s-grid__item--hidden) [data-grid-data]");
  log.info("Extract products", { url, products: products.length });
  const items = [];
  for (const el of products) {
    stats.inc("items");
    const data = JSON.parse(el.dataset.gridData);
    if (processedIds.has(data.productId)) {
      stats.inc("itemsDuplicity");
      continue;
    }
    processedIds.add(data.productId);
    stats.inc("itemsUnique");
    items.push({
      itemId: data.productId,
      itemUrl: new URL(data.canonicalUrl, url).href,
      itemName: data.fullTitle,
      currency: "CZK",
      currentPrice: parseFloat(data.price.price),
      img: data.image,
      originalPrice: parseFloat(data.price.oldPrice),
      discounted: Boolean(data.price.discount),
      inStock: data.stockAvailability.onlineAvailable,
      category: data.category.split("/").slice(1).join(" > "),
      slug: data.productId
    });
  }
  return items;
}

async function loadLazyContent({ page }) {
  await page.waitForLoadState("networkidle");

  page.on("console", consoleObj => console.log(consoleObj.text()));

  await page.evaluate(async () => {
    /* global window, document */
    if (!document.body) return;
    const maxScrolls = 100;
    let scrollCount = 0;
    let scrolledBy = 0;
    while (scrollCount < maxScrolls) {
      scrolledBy += 1000;
      window.scrollTo(0, scrolledBy);
      if (scrolledBy >= document.body.scrollHeight) break;
      scrollCount += 1;
      await sleep(250);
    }
  });

  await sleep(1000);
  await page.waitForLoadState("networkidle");
}

async function main() {
  const rollbar = Rollbar.init();
  const processedIds = new Set();

  const {
    development,
    debug,
    maxRequestRetries = 3,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full,
    urls
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development && !debug
  });

  const crawler =
    type === ActorType.BlackFriday
      ? new PlaywrightCrawler({
          maxRequestsPerMinute: 400,
          proxyConfiguration,
          maxRequestRetries,
          launchContext: {
            launchOptions: {
              headless: true
            }
          },
          postNavigationHooks: [loadLazyContent],
          async requestHandler(context) {
            const { request, log, page } = context;
            const { label } = request.userData;
            log.info("processing page", { url: request.url, label });

            const text = await page.content();
            const { document } = parseHTML(text);
            const products = extractBlackFridayProducts({ document, url: request.url }, { stats, processedIds });
            await Dataset.pushData(products);
          }
        })
      : new HttpCrawler({
          maxRequestsPerMinute: 400,
          proxyConfiguration,
          maxRequestRetries,
          async requestHandler(context) {
            const { request, log, body } = context;
            const { label } = request.userData;
            log.info("processing page", { url: request.url, label });

            const { document } = parseHTML(body.toString());

            switch (label) {
              case Labels.DETAIL:
                {
                  const product = scrapeDetail({ request, document });
                  await Dataset.pushData(product);
                }
                break;
              case Labels.LIDL_SHOP:
                await crawler.requestQueue.addRequests(mainNavigationRequests(document));
                break;
              case Labels.LIDL_SHOP_CAT:
                const nextButton = document.querySelector(".s-load-more__button");
                if (nextButton) {
                  await crawler.requestQueue.addRequest(
                    {
                      url: new URL(nextButton.getAttribute("href"), "https://www.lidl.cz").href,
                      userData: { label: Labels.LIDL_SHOP_CAT }
                    },
                    { forefront: true }
                  );
                }
                const products = extractProducts({
                  document,
                  stats,
                  processedIds,
                  log,
                  url: request.url
                });
                await Dataset.pushData(products);
                break;
              case Labels.LIDL_SHOP_MAIN_CAT:
                await crawler.requestQueue.addRequests(scrapeShopMainCategory({ document, request }));
                break;
              case Labels.LIDL_SHOP_SECTION:
                await crawler.requestQueue.addRequests(shopSectionRequests({ document, request }, { stats }));
                break;
              case Labels.MAIN_NABIDKA:
                await crawler.requestQueue.addRequests(mainMenuRequests(document));
                break;
              case Labels.MAIN_NABIDKA_CAT:
                await crawler.requestQueue.addRequests(mainMenuCategoryRequests(document), {
                  forefront: true
                });
                break;
            }
          },
          async failedRequestHandler({ request }, error) {
            stats.inc("failed");
            rollbar.error(error, request);
            log.error(`Request ${request.url} failed multiple times`, request);
          }
        });

  await crawler.run(createInitRequests({ urls, type }));
  await stats.save(true);
  log.info("crawler finished");

  if (!development) {
    const tableName = type === ActorType.BlackFriday ? "lidl_cz_bf" : "lidl_cz";
    await uploadToKeboola(tableName);
  }

  log.info("Finished.");
}

await Actor.main(main);
