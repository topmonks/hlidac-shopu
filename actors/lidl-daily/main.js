import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, Dataset, log, KeyValueStore, LogLevel } from "apify";
import { parseHTML } from "linkedom";
import { PlaywrightCrawler } from "@crawlee/playwright";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

export const LABELS = {
  MAIN_NABIDKA: "MAIN_NABIDKA",
  MAIN_NABIDKA_CAT: "MAIN_NABIDKA_CAT",
  DETAIL: "DETAIL",
  LIDL_SHOP: "LIDL_SHOP",
  LIDL_SHOP_MAIN_CAT: "LIDL_SHOP_MAIN_CAT",
  LIDL_SHOP_CAT: "LIDL_SHOP_CAT",
  LIDL_SHOP_DETAIL: "LIDL_SHOP_DETAIL",
  LIDL_SHOP_SECTION: "LIDL_SHOP_SECTION"
};
export const MAIN_URL = "https://www.lidl.cz";

export async function createInitRequests(requestQueue) {
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
  await requestQueue.addRequest({
    url: "https://www.lidl.cz/q/query/Slevy?offset=0&sort=Price-asc",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  await requestQueue.addRequest({
    url: "https://www.lidl.cz/c/kategorie/s10004543",
    userData: {
      label: LABELS.LIDL_SHOP_SECTION,
      level: 1
    }
  });
}

export function getItemId(url) {
  const arr = url.split("/");
  return arr[arr.length - 1];
}

export function getBaseProducts(documnet) {
  return documnet.querySelectorAll("article.product").map(article => {
    const title = article.querySelector("h3").innerText.trim();
    const mainFrame = article.querySelector("a.product__body");
    const itemUrl = mainFrame.getAttribute("href");
    const imageSource = mainFrame.querySelectorAll("picture source")[0];
    const imageLargeArr = imageSource.getAttribute("data-srcset").split(",");
    const result = {
      itemId: getItemId(itemUrl),
      itemUrl: `${MAIN_URL}${itemUrl}`,
      itemName: title,
      currency: "CZK",
      img: imageLargeArr[0],
      currentPrice: parseFloat(
        article.querySelector(".pricebox__price").innerText.trim()
      ),
      originalPrice: null,
      discounted: false
    };
    const price = article
      .querySelector(".pricebox__recommended-retail-price")
      .innerText.trim();
    if (price) {
      result.discounted = true;
      result.originalPrice = parseFloat(price);
    }
    return result;
  });
}

async function scrapeMainMenu({ document, crawler }) {
  log.info("Start scrapeMainMenu");
  const subMenu = document.querySelectorAll("a.theme__item");
  log.debug(`Found ${subMenu.length} subcategories`);
  for (const m of subMenu) {
    await crawler.requestQueue.addRequest({
      url: `${MAIN_URL}${m.getAttribute("href")}`,
      userData: {
        label: LABELS.MAIN_NABIDKA_CAT
      }
    });
  }
}

async function scrapeMainMenuCategory({ document, crawler }) {
  const products = getBaseProducts(document);
  for (const product of products) {
    await crawler.requestQueue.addRequest(
      {
        url: product.itemUrl,
        userData: {
          label: LABELS.DETAIL,
          product
        }
      },
      { forefront: true }
    );
  }
}

async function scrapeDetail({ request, document }) {
  const {
    userData: { product }
  } = request;
  let breadcrumbs = document.querySelectorAll(
    ".breadcrumbs__items-container .breadcrumbs__text"
  );
  if (product) {
    breadcrumbs = breadcrumbs.slice(0, breadcrumbs.length - 1);
    product.category = breadcrumbs.map(b => b.innerText.trim()).join(" > ");
    await Dataset.pushData(product);
  }
}

async function scrapeShop({ document, crawler }) {
  const mainMenu = document.querySelectorAll(
    "ol.n-header__main-navigation--sub a.n-header__main-navigation-link"
  );
  for (let menu of mainMenu) {
    await crawler.requestQueue.addRequest({
      url: `https://www.lidl.cz${menu.getAttribute("href")}`,
      userData: {
        label: LABELS.LIDL_SHOP_MAIN_CAT,
        level: 1
      }
    });
  }
}

async function enqueueCategories(document, level, cats, crawler, catLevel) {
  for (const c of cats) {
    const name = document.querySelector("div > a, > span");
    const isSelected = name.classList.contains("s-anchor--selected");
    const subCats = c.querySelectorAll("ul > li");
    if (isSelected && subCats.length > 0) {
      await enqueueCategories(document, level, subCats, crawler, catLevel + 1);
    } else if (!isSelected && subCats.length === 0 && catLevel > level) {
      log.info(`enqueue category: ${name.innerText.trim()}`);
      await crawler.requestQueue.addRequest({
        url: `https://www.lidl.cz${c.querySelector("a").getAttribute("href")}`,
        userData: {
          label:
            catLevel < 2 ? LABELS.LIDL_SHOP_MAIN_CAT : LABELS.LIDL_SHOP_CAT,
          level: catLevel
        }
      });
    }
  }
}

async function scrapeShopMainCategory({ document, request, crawler }) {
  const { level } = request.userData;
  const cats = document.querySelectorAll("#category > ul > li");
  await enqueueCategories(document, level, cats, crawler, 0);
}

async function scrapeShopSection({ document, request, crawler }, { stats }) {
  const { level } = request.userData;
  const sections = document.querySelectorAll(
    "div.APageRoot__Sections li.ATheContentPageCardList__Item a.ATheContentPageCardList__Item--Linked"
  );
  for (let section of sections) {
    const a = section.getAttribute("href");
    if (level === 1) {
      await crawler.requestQueue.addRequest({
        url: a,
        userData: {
          label: LABELS.LIDL_SHOP_SECTION,
          level: 2
        }
      });
    } else if (level === 2) {
      await crawler.requestQueue.addRequest({
        url: a,
        userData: {
          label: LABELS.LIDL_SHOP_CAT
        }
      });

      stats.inc("categories");
    }
  }
  log.info(`Found ${sections.length}x categories in ${request.url}`);
}

const from =
  "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆĞÍÌÎÏİŇÑÓÖÒÔÕØŘŔŠŞŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇğíìîïıňñóöòôõøðřŕšşťúůüùûýÿžþÞĐđßÆa·/_,:;";
const to =
  "AAAAAACCCDEEEEEEEEGIIIIINNOOOOOORRSSTUUUUUYYZaaaaaacccdeeeeeeeegiiiiinnooooooorrsstuuuuuyyzbBDdBAa------";

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

async function scrapeShopCategory(
  { document, crawler },
  { stats, processedIds, input }
) {
  const { type = ActorType.FULL } = input;
  const nextButton = document.querySelector("a.s-load-more__button");
  if (nextButton) {
    await crawler.requestQueue.addRequest(
      {
        url: `https://www.lidl.cz${nextButton.getAttribute("href")}`,
        userData: {
          label: LABELS.LIDL_SHOP_CAT
        }
      },
      { forefront: true }
    );
  }
  let products = document.querySelectorAll("#s-results .s-grid__item > div");
  if (type === ActorType.BF) {
    products = document.querySelectorAll(".product-grid-box");
  }
  const requests = [];
  let breadcrumbs = document.querySelectorAll(
    ".s-breadcrumb a.s-breadcrumb__link"
  );
  breadcrumbs = breadcrumbs.slice(1, breadcrumbs.length);
  const heading = document.querySelector(".s-page-heading h1").innerText.trim();
  for (let product of products) {
    const dataQaLabel = product.getAttribute("data-qa-label");
    if (!dataQaLabel) {
      continue;
    }
    const itemId = dataQaLabel.split("-").pop();
    stats.inc("items");
    if (!processedIds.has(itemId)) {
      processedIds.add(itemId);
      const title = product.querySelector("h2").innerText.trim();

      const itemUrl = `https://www.lidl.cz/p/${slug(title)}/p${itemId}`;
      const imageSource = product.querySelector("img.product-grid-box__image");
      const price = product.querySelector(
        ".product-grid-box__price .m-price__bottom .m-price__price"
      );
      const stock = product.querySelector(
        ".product-grid-box__availabilities > .badge"
      );
      const result = {
        itemId,
        itemUrl,
        itemName: title,
        currency: "CZK",
        currentPrice: parseFloat(price.innerText.trim()),
        img: imageSource.getAttribute("src"),
        originalPrice: null,
        discounted: false,
        inStock: !!stock.classList.contains("badge--available-online"),
        category:
          breadcrumbs.length === 0
            ? heading
            : breadcrumbs.map(b => b.innerText.trim()).join(" > "),
        slug: itemId
      };
      const strikePrice = product.querySelector(
        ".product-grid-box__price .m-price__top"
      );
      if (strikePrice) {
        let price = strikePrice.innerText.trim();
        price = price.match(/(\d+)/)[1];
        result.discounted = true;
        result.originalPrice = parseFloat(price);
      }
      if (type === ActorType.BF) {
        result.category = "Black Friday";
      }
      await Dataset.pushData(result);
      stats.inc("itemsUnique");
    } else {
      stats.inc("itemsDuplicity");
    }
  }
}

async function main() {
  const rollbar = Rollbar.init();
  const processedIds = new Set();
  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 5,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full,
    urls
  } = input;

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });

  const requestQueue = await Actor.openRequestQueue();
  if (type === ActorType.BlackFriday) {
    await requestQueue.addRequest({
      url: urls?.length
        ? urls[0]
        : "https://www.lidl.cz/c/black-friday/a10016094",
      userData: {
        label: LABELS.LIDL_SHOP_CAT,
        level: 1
      }
    });
  } else {
    await createInitRequests(requestQueue);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new PlaywrightCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    navigationTimeoutSecs: 120,
    launchContext: {
      useChrome: true,
      launchOptions: {
        headless: true
      }
    },
    async requestHandler(context) {
      const { request, page } = context;
      await page.waitForLoadState("networkidle", { timeout: 0 });
      const text = await page.content();
      const { document } = parseHTML(text);
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${request.url}]`);

      switch (label) {
        case LABELS.DETAIL:
          return scrapeDetail({ ...context, document });
        case LABELS.LIDL_SHOP:
          return scrapeShop({ ...context, document });
        case LABELS.LIDL_SHOP_CAT:
          return scrapeShopCategory(
            { ...context, document },
            {
              stats,
              processedIds,
              input
            }
          );
        case LABELS.LIDL_SHOP_DETAIL:
        // return scrapeShopDetail({ ...context, document });
        case LABELS.LIDL_SHOP_MAIN_CAT:
          return scrapeShopMainCategory({ ...context, document });
        case LABELS.LIDL_SHOP_SECTION:
          return scrapeShopSection({ ...context, document }, { stats });
        case LABELS.MAIN_NABIDKA:
          return scrapeMainMenu({ ...context, document });
        case LABELS.MAIN_NABIDKA_CAT:
          return scrapeMainMenuCategory({ ...context, document });
      }
    },
    async failedRequestHandler({ error, request }) {
      stats.inc("failed");
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  await stats.save(true);
  log.info("crawler finished");

  if (!development) {
    await uploadToKeboola(type !== ActorType.BF ? "lidl_cz" : "lidl_cz_bf");
  }

  log.info("Finished.");
}

await Actor.main(main);
