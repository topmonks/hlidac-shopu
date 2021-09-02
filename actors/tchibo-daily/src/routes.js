const Apify = require("apify");
const {
  toProduct,
  uploadToS3
} = require("@hlidac-shopu/actors-common/product.js");
const { URL } = require("url");
const { LABELS, COFFEE_CATEGORIES, THROW_AWAY_CATEGORIES } = require("./const");
const tools = require("./tools");
const {
  utils: { log }
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
const NAVIGATION = async ({ json, crawler }) => {
  const { country = "cz" } = global.userInput;
  for (const { children } of json.list) {
    if (children.length > 0) {
      for (const { href } of children) {
        if (THROW_AWAY_CATEGORIES.includes(href)) {
          continue;
        }
        if (!COFFEE_CATEGORIES.includes(href)) {
          await crawler.requestQueue.addRequest({
            url: `https://www.tchibo.${country}/${href}`,
            userData: {
              label: LABELS.CATEGORY
            }
          });
        } else {
          await crawler.requestQueue.addRequest({
            url: `https://www.tchibo.${country}/${href}`,
            userData: {
              label: LABELS.COFFEE_CATEGORY
            }
          });
        }
      }
    }
  }
};

const CATEGORY = async ({ $, crawler }) => {
  const menu = $(".c-tp-sidebarnavigation > ul > li > ul > li > a").toArray();
  for (const m of menu) {
    await crawler.requestQueue.addRequest({
      url: $(m).attr("href"),
      userData: {
        label: LABELS.CATEGORY_CAT
      }
    });
  }
};

const CATEGORY_CAT = async ({ $, crawler }) => {
  const selectedCategory = $("a.active").parent().find("ul > li > a").toArray();
  if (selectedCategory && selectedCategory.length > 0) {
    for (const s of selectedCategory) {
      await crawler.requestQueue.addRequest({
        url: $(s).attr("href"),
        userData: {
          label: LABELS.LIST,
          page: 0
        }
      });
    }
  }
};

const SUBCATEGORY = async ({ $, crawler }) => {
  const selectedCategory = $("a.active").parent().find("ul > li > a").toArray();
  if (selectedCategory && selectedCategory.length > 0) {
    for (const s of selectedCategory) {
      await crawler.requestQueue.addRequest({
        url: $(s).attr("href"),
        userData: {
          label: LABELS.LIST,
          page: 0
        }
      });
    }
  }
};

const LIST = async ({ request: { url, userData }, $, crawler }) => {
  const { s3, handledIdsSet, currency } = global;
  const { country = "cz" } = global.userInput;
  let { page } = userData;
  const searchResults = $(".searchResults");
  if (page === 0) {
    const finalCount = parseInt(searchResults.attr("data-result-count"), 10);
    if (finalCount > 30) {
      page = 2;
      let pCount = 0;
      while (pCount < finalCount) {
        await crawler.requestQueue.addRequest({
          url: `${url}?page=${page}`,
          userData: {
            label: LABELS.LIST,
            page: page++
          }
        });
        pCount += 30;
      }
    }
  }
  const breadcrumbItems = $(".c-tp-breadcrumb-item > a").toArray();
  const productList = $("div[data-search-result-list-entry]").toArray();
  const promises = [];
  if (productList.length > 0) {
    for (const product of productList) {
      const itemId = $(product).attr("data-product-id");
      if (handledIdsSet.has(itemId)) {
        continue;
      }
      handledIdsSet.add(itemId);
      const image = $(product).find(".m-tp-productbox002-image");
      const url = image.parent().attr("href");
      const itemName = image.attr("alt");
      const img = image.attr("data-src");
      const currentPrice = $(product)
        .find(".c-tp-price-currentprice")
        .text()
        .trim();
      const oldPrice = $(product).find(".c-tp-price-oldprice").text().trim();
      const result = {
        itemId,
        itemUrl: url,
        slug: tools.getSlug(url),
        itemName,
        img: `https://www.tchibo.${country}${img}`,
        discounted: false,
        originalPrice: null,
        currency,
        currentPrice: tools.parsePrice(currentPrice),
        category: breadcrumbItems.map(p => $(p).text().trim()).join(" > ")
      };
      if (oldPrice && oldPrice.length > 0) {
        result.discounted = true;
        result.originalPrice = tools.parsePrice(oldPrice);
      }
      // promises.push(Apify.pushData(result));
      promises.push(
        Apify.pushData(result),
        uploadToS3(
          s3,
          `tchibo.${country}`,
          result.itemId,
          "jsonld",
          toProduct(
            {
              ...result,
              inStock: true
            },
            { priceCurrency: result.currency }
          )
        )
      );
    }
    await Promise.all(promises);
  }
};

const COFFEE_CATEGORY = async ({ $, crawler }) => {
  const { s3, handledIdsSet, currency } = global;
  const { country = "cz" } = global.userInput;
  const products = $(".m-tp-productbox002").toArray();
  let promises = [];
  for (const p of products) {
    const titleObject = $(p).find(".m-tp-productbox002-title");
    const itemId = titleObject.find("a").attr("data-pds-link");
    if (handledIdsSet.has(itemId)) {
      continue;
    }
    handledIdsSet.add(itemId);
    const title = titleObject.find("a").attr("title");
    const itemUrl = titleObject.find("a").attr("href");
    const name = titleObject.find("a > span").text().trim();
    const subName = $(p).find(".m-tp-productbox002-flavor").text().trim();
    const img = $(p).find(".m-tp-productbox002-image").attr("data-src");
    const currentPrice = $(p).find(".c-tp-price-currentprice").text().trim();
    const oldPrice = $(p).find(".c-tp-price-oldprice").text().trim();
    const result = {
      itemId,
      itemUrl,
      slug: tools.getSlug(itemUrl),
      itemName: `${title ? `${title} - ` : ""}${name}${
        subName ? ` - ${subName}` : ""
      }`,
      img: `https://www.tchibo.${country}/${img}`,
      originalPrice: null,
      discounted: false,
      currency,
      currentPrice: tools.parsePrice(currentPrice),
      category: tools.getCoffeeCategory()
    };
    if (oldPrice && oldPrice.length > 0) {
      result.discounted = true;
      result.originalPrice = tools.parsePrice(oldPrice);
    }
    // promises.push(Apify.pushData(result));
    promises.push(
      Apify.pushData(result),
      uploadToS3(
        s3,
        `tchibo.${country}`,
        result.itemId,
        "jsonld",
        toProduct(
          {
            ...result,
            inStock: true
          },
          { priceCurrency: result.currency }
        )
      )
    );
    if (promises.length > 40) {
      await Promise.all(promises);
      promises = [];
    }
  }
  await Promise.all(promises);
  const subCategories = $(
    ".m-coffee-categoryTeaser--tileWrapper > a, .m-coffee-teaser-slider > a"
  ).toArray();
  for (const sc of subCategories) {
    await crawler.requestQueue.addRequest({
      url: $(sc).attr("href"),
      userData: {
        label: LABELS.COFFEE_CATEGORY
      }
    });
  }
};

module.exports = {
  createRouter,
  NAVIGATION,
  CATEGORY,
  CATEGORY_CAT,
  SUBCATEGORY,
  COFFEE_CATEGORY,
  LIST
};
