const Apify = require("apify");
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const { URL } = require("url");
const { LABELS, MAIN_URL } = require("./const");
const tools = require("./tools");
const {
  utils: { log, requestAsBrowser }
} = Apify;

// Create router
const createRouter = globalContext => {
  return async function (routeName, requestContext) {
    const route = module.exports[routeName];
    if (!route) throw new Error(`No route for name: ${routeName}`);
    log.debug(`Invoking route: ${routeName}`);
    return route(requestContext, globalContext);
  };
};

const MAIN_NABIDKA = async ({ $, crawler }) => {
  log.info("Start MAIN_NABIDKA");
  const subMenu = $("a.theme__item").toArray();
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
  const products = tools.getBaseProducts($);
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
    await uploadToS3(
      s3,
      "lidl.cz",
      product.itemId,
      "jsonld",
      toProduct(
        {
          ...product,
          inStock: true
        },
        { priceCurrency: product.currency }
      )
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
      url: `https://www.lidl-shop.cz${menu}`,
      userData: {
        label: LABELS.LIDL_SHOP_MAIN_CAT,
        level: 1
      }
    });
  }
};

const enqueueCategories = async ($, level, cats, crawler, catLevel) => {
  for (const c of cats) {
    const name = $(c).find("> div > a");
    const namee = name.text().trim();
    const isSelected = name.hasClass("s-anchor--selected");
    const subCats = $(c).find("> ul > li").toArray();
    if (isSelected && subCats && subCats.length > 0) {
      await enqueueCategories($, level, subCats, crawler, catLevel + 1);
    } else if (!isSelected && subCats.length === 0 && catLevel > level) {
      await crawler.requestQueue.addRequest({
        url: `https://www.lidl-shop.cz${$(c).find("a").attr("href")}`,
        userData: {
          label:
            catLevel < 3 ? LABELS.LIDL_SHOP_MAIN_CAT : LABELS.LIDL_SHOP_CAT,
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

const LIDL_SHOP_CAT = async ({ $, crawler, request }) => {
  const { s3 } = global;
  const nextButton = $("a.s-load-more__button");
  if (nextButton && nextButton.length > 0) {
    await crawler.requestQueue.addRequest({
      url: `https://www.lidl-shop.cz${nextButton.attr("href")}`,
      userData: {
        label: LABELS.LIDL_SHOP_CAT
      }
    });
  }
  const products = $("#s-results .s-grid__item > a").toArray();
  const requests = [];
  let breadcrumbs = $(".s-breadcrumb .s-breadcrumb__item").toArray();
  breadcrumbs = breadcrumbs.slice(1, breadcrumbs.length);
  for (let product of products) {
    product = $(product);
    const a = product.attr("href");
    const title = product.find("h2").text().trim();
    const url = new URL(`https://www.lidl-shop.cz${a}`);
    const imageSource = product.find("img.product-grid-box__image");
    const price = $(
      ".product-grid-box__price .m-price__bottom .m-price__price"
    );
    const stock = product.find(".product-grid-box__availabilities > .badge");
    const result = {
      itemId: tools.getItemId(url.pathname),
      itemUrl: `https://www.lidl-shop.cz${url.pathname}`,
      itemName: title,
      currency: "CZK",
      currentPrice: parseFloat(price.text().trim()),
      img: $(imageSource).attr("src"),
      originalPrice: null,
      discounted: false,
      inStock: !!stock.hasClass("badge--available-online"),
      category: breadcrumbs.map(b => $(b).text().trim()).join(" > ")
    };
    const strikePrice = $(".product-grid-box__price .m-price__top");
    if (strikePrice && strikePrice.length > 0) {
      result.discounted = true;
      result.originalPrice = parseFloat(strikePrice.text().trim());
    }
    requests.push(
      Apify.pushData(result),
      uploadToS3(
        s3,
        "lidl.cz",
        result.itemId,
        "jsonld",
        toProduct(result, { priceCurrency: result.currency })
      )
    );
  }
  await Promise.all(requests);
};

module.exports = {
  createRouter,
  MAIN_NABIDKA,
  MAIN_NABIDKA_CAT,
  LIDL_SHOP,
  LIDL_SHOP_MAIN_CAT,
  LIDL_SHOP_CAT,
  DETAIL
};
