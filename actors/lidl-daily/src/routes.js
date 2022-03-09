import Apify from "apify";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import { URL } from "url";
import { LABELS, MAIN_URL, BF } from "./const.js";
import { getBaseProducts } from "./tools.js";

const {
  utils: { log }
} = Apify;

// Create router
export function createRouter(globalContext) {
  return async function (routeName, requestContext) {
    const route = routes[routeName];
    if (!route) throw new Error(`No route for name: ${routeName}`);
    log.debug(`Invoking route: ${routeName}`);
    return route(requestContext, globalContext);
  };
}

const MAIN_NABIDKA = async ({ $, crawler }) => {
  log.info("Start MAIN_NABIDKA");
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
};

const MAIN_NABIDKA_CAT = async ({ $, crawler }) => {
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
};

const DETAIL = async ({ request, $ }) => {
  const { s3 } = global;
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
    await uploadToS3v2(
      s3,
      {
        ...product,
        inStock: true
      },
      { priceCurrency: product.currency }
    );
  }
};

const LIDL_SHOP = async ({ $, crawler }) => {
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
};

const enqueueCategories = async ($, level, cats, crawler, catLevel) => {
  for (const c of cats) {
    const name = $(c).find("> div > a, > span");
    const namee = name.text().trim();
    const isSelected = name.hasClass("s-anchor--selected");
    const subCats = $(c).find("> ul > li").toArray();
    if (isSelected && subCats && subCats.length > 0) {
      await enqueueCategories($, level, subCats, crawler, catLevel + 1);
    } else if (!isSelected && subCats.length === 0 && catLevel > level) {
      log.info(`enqueue category: ${namee}`);
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
};

const LIDL_SHOP_MAIN_CAT = async ({ $, request, crawler }) => {
  const { level } = request.userData;
  const category = $("#category > ul");
  let cats = category.find(" > li").toArray();
  await enqueueCategories($, level, cats, crawler, 0);
};

const LIDL_SHOP_DETAIL = async ({ $, request, crawler }) => {
  const detail = $("body").html();
  console.log(detail);
};

const LIDL_SHOP_SECTION = async ({ $, request, crawler }) => {
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

      global.stats.categories++;
    }
  }
  log.info(`Found ${sections.length}x categories in ${request.url}`);
};

const LIDL_SHOP_CAT = async ({ $, crawler }) => {
  const { s3, stats, processedIds, input } = global;
  const { type = "FULL" } = input;
  const nextButton = $("a.s-load-more__button");
  if (nextButton && nextButton.length > 0) {
    await crawler.requestQueue.addRequest({
      url: `https://www.lidl.cz${nextButton.attr("href")}`,
      userData: {
        label: LABELS.LIDL_SHOP_CAT
      }
    });
  }
  let products = $("#s-results .s-grid__item > a").toArray();
  if (type === BF) {
    products = $(".product-grid-box").toArray();
  }
  const requests = [];
  let breadcrumbs = $(".s-breadcrumb a.s-breadcrumb__link").toArray();
  breadcrumbs = breadcrumbs.slice(1, breadcrumbs.length);
  const heading = $(".s-page-heading").find("h1").text().trim();
  for (let product of products) {
    product = $(product);
    const a = product.attr("href");
    const url = new URL(`https://www.lidl.cz${a}`);
    const itemUrl = `https://www.lidl.cz${url.pathname}`;
    stats.items++;
    if (!processedIds.has(itemUrl)) {
      processedIds.add(itemUrl);
      const title = product.find("h2").text().trim();
      const imageSource = product.find("img.product-grid-box__image");
      const price = product.find(
        "> .product-grid-box__price .m-price__bottom .m-price__price"
      );
      const stock = product.find(".product-grid-box__availabilities > .badge");
      const result = {
        itemId: itemUrl,
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
        slug: itemUrl
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
      if (type === BF) {
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
  await Promise.allSettled(requests);
};

const routes = {
  MAIN_NABIDKA,
  MAIN_NABIDKA_CAT,
  LIDL_SHOP,
  LIDL_SHOP_MAIN_CAT,
  LIDL_SHOP_CAT,
  LIDL_SHOP_SECTION,
  LIDL_SHOP_DETAIL,
  DETAIL
};
