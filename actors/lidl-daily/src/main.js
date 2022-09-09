import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { createInitRequests, getBaseProducts } from "./tools.js";
import { LABELS, MAIN_URL } from "./const.js";
import cheerio from "cheerio";

const { log } = Apify.utils;

async function scrapeMainMenu({ $, crawler }) {
  log.info("Start scrapeMainMenu");
  const subMenu = $("a.theme__item").toArray();
  log.debug(`Found ${subMenu.length} subcategories`);
  for (const m of subMenu) {
    await crawler.requestQueue.addRequest({
      url: `${MAIN_URL}${$(m).attr("href")}`,
      userData: {
        label: LABELS.MAIN_NABIDKA_CAT
      }
    });
  }
}

async function scrapeMainMenuCategory({ $, crawler }) {
  const products = getBaseProducts($);
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

async function scrapeDetail({ request, $ }, { s3 }) {
  const {
    userData: { product }
  } = request;
  let breadcrumbs = $(
    ".breadcrumbs__items-container .breadcrumbs__text"
  ).toArray();
  if (product) {
    breadcrumbs = breadcrumbs.slice(0, breadcrumbs.length - 1);
    product.category = breadcrumbs.map(b => $(b).text().trim()).join(" > ");
    await Apify.pushData(product);
    await uploadToS3v2(s3, product, {
      priceCurrency: product.currency,
      inStock: true
    });
  }
}

async function scrapeShop({ $, crawler }) {
  const mainMenu = $(
    "ol.n-header__main-navigation--sub a.n-header__main-navigation-link"
  ).toArray();
  for (let menu of mainMenu) {
    menu = $(menu).attr("href");
    await crawler.requestQueue.addRequest({
      url: `https://www.lidl.cz${menu}`,
      userData: {
        label: LABELS.LIDL_SHOP_MAIN_CAT,
        level: 1
      }
    });
  }
}

async function enqueueCategories($, level, cats, crawler, catLevel) {
  for (const c of cats) {
    const name = $(c).find("> div > a, > span");
    const isSelected = name.hasClass("s-anchor--selected");
    const subCats = $(c).find("> ul > li").toArray();
    if (isSelected && subCats && subCats.length > 0) {
      await enqueueCategories($, level, subCats, crawler, catLevel + 1);
    } else if (!isSelected && subCats.length === 0 && catLevel > level) {
      log.info(`enqueue category: ${name.text().trim()}`);
      await crawler.requestQueue.addRequest({
        url: `https://www.lidl.cz${$(c).find("a").attr("href")}`,
        userData: {
          label:
            catLevel < 2 ? LABELS.LIDL_SHOP_MAIN_CAT : LABELS.LIDL_SHOP_CAT,
          level: catLevel
        }
      });
    }
  }
}

async function scrapeShopMainCategory({ $, request, crawler }) {
  const { level } = request.userData;
  const category = $("#category > ul");
  let cats = category.find(" > li").toArray();
  await enqueueCategories($, level, cats, crawler, 0);
}

async function scrapeShopDetail({ $ }) {
  const detail = $("body").html();
}

async function scrapeShopSection({ $, request, crawler }, { stats }) {
  const { level } = request.userData;
  const sections = $(
    "div.APageRoot__Sections li.ATheContentPageCardList__Item a.ATheContentPageCardList__Item--Linked"
  ).toArray();
  for (let section of sections) {
    section = $(section);
    const a = section.attr("href");
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

      stats.categories++;
    }
  }
  log.info(`Found ${sections.length}x categories in ${request.url}`);
}

const slug = function (str) {
  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from =
    "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆĞÍÌÎÏİŇÑÓÖÒÔÕØŘŔŠŞŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇğíìîïıňñóöòôõøðřŕšşťúůüùûýÿžþÞĐđßÆa·/_,:;";
  const to =
    "AAAAAACCCDEEEEEEEEGIIIIINNOOOOOORRSSTUUUUUYYZaaaaaacccdeeeeeeeegiiiiinnooooooorrsstuuuuuyyzbBDdBAa------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes

  return str;
};

async function scrapeShopCategory(
  { $, crawler },
  { s3, stats, processedIds, input }
) {
  const { type = ActorType.FULL } = input;
  const nextButton = $("a.s-load-more__button");
  if (nextButton && nextButton.length > 0) {
    await crawler.requestQueue.addRequest(
      {
        url: `https://www.lidl.cz${nextButton.attr("href")}`,
        userData: {
          label: LABELS.LIDL_SHOP_CAT
        }
      },
      { forefront: true }
    );
  }
  let products = $("#s-results .s-grid__item > div").toArray();
  if (type === ActorType.BF) {
    products = $(".product-grid-box").toArray();
  }
  const requests = [];
  let breadcrumbs = $(".s-breadcrumb a.s-breadcrumb__link").toArray();
  breadcrumbs = breadcrumbs.slice(1, breadcrumbs.length);
  const heading = $(".s-page-heading").find("h1").text().trim();
  for (let product of products) {
    product = $(product);
    const dataQaLabel = product.attr("data-qa-label");
    if (!dataQaLabel) {
      continue;
    }
    const itemId = dataQaLabel.split("-").pop();
    stats.items++;
    if (!processedIds.has(itemId)) {
      processedIds.add(itemId);
      const title = product.find("h2").text().trim();

      const itemUrl = `https://www.lidl.cz/p/${slug(title)}/p${itemId}`;
      const imageSource = product.find("img.product-grid-box__image");
      const price = product.find(
        "> .product-grid-box__price .m-price__bottom .m-price__price"
      );
      const stock = product.find(".product-grid-box__availabilities > .badge");
      const result = {
        itemId,
        itemUrl,
        itemName: title,
        currency: "CZK",
        currentPrice: parseFloat(price.text().trim()),
        img: $(imageSource).attr("src"),
        originalPrice: null,
        discounted: false,
        inStock: !!stock.hasClass("badge--available-online"),
        category:
          breadcrumbs.length === 0
            ? heading
            : breadcrumbs.map(b => $(b).text().trim()).join(" > "),
        slug: itemId
      };
      const strikePrice = product.find(
        "> .product-grid-box__price .m-price__top"
      );
      if (strikePrice && strikePrice.length > 0) {
        let price = strikePrice.text().trim();
        price = price.match(/(\d+)/)[1];
        result.discounted = true;
        result.originalPrice = parseFloat(price);
      }
      if (type === ActorType.BF) {
        result.category = "Black Friday";
      }
      requests.push(
        Apify.pushData(result),
        uploadToS3v2(s3, result, { priceCurrency: result.currency })
      );
      stats.itemsUnique++;
    } else {
      stats.itemsDuplicity++;
    }
  }
  log.info(`Found ${requests.length / 2} unique products`);
  await Promise.all(requests);
}

Apify.main(async function main() {
  rollbar.init();
  const processedIds = new Set();
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 5,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = input ?? {};
  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  if (type !== ActorType.BF) {
    await createInitRequests(requestQueue);
  } else {
    await requestQueue.addRequest({
      url: "https://www.lidl.cz/c/black-friday/a10010065",
      userData: {
        label: LABELS.LIDL_SHOP_CAT,
        level: 1
      }
    });
  }

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.PlaywrightCrawler({
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
    handlePageFunction: async context => {
      const { request, page } = context;
      await page.waitForLoadState("networkidle", { timeout: 0 });
      const text = await page.content();
      const $ = cheerio.load(text);
      const {
        userData: { label }
      } = request;
      log.info(`Processing: [${request.url}]`);

      switch (label) {
        case LABELS.DETAIL:
          return scrapeDetail({ ...context, $ }, { s3 });
        case LABELS.LIDL_SHOP:
          return scrapeShop({ ...context, $ });
        case LABELS.LIDL_SHOP_CAT:
          return scrapeShopCategory(
            { ...context, $ },
            {
              s3,
              stats,
              processedIds,
              input
            }
          );
        case LABELS.LIDL_SHOP_DETAIL:
          return scrapeShopDetail({ ...context, $ });
        case LABELS.LIDL_SHOP_MAIN_CAT:
          return scrapeShopMainCategory({ ...context, $ });
        case LABELS.LIDL_SHOP_SECTION:
          return scrapeShopSection({ ...context, $ }, { stats });
        case LABELS.MAIN_NABIDKA:
          return scrapeMainMenu({ ...context, $ });
        case LABELS.MAIN_NABIDKA_CAT:
          return scrapeMainMenuCategory({ ...context, $ });
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      stats.failed++;
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `lidl.cz`);
    log.info("invalidated Data CDN");

    await uploadToKeboola(type !== ActorType.BF ? "lidl_cz" : "lidl_cz_bf");
  }

  log.info("Finished.");
});
