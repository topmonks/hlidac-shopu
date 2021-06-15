const Apify = require("apify");
const { LABELS } = require("./const");
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

const START = async ({ $, crawler }) => {
  log.info("START with main page");
  const mainCategories = [];
  $("section.main-menu nav > ul")
    .children()
    .each(function () {
      const link = $(this).find(" > a");
      mainCategories.push({
        url: `${tools.getRootUrl()}${link.attr("href")}`,
        userData: {
          label: LABELS.MAIN_CATEGORY,
          mainCategory: link.text()
        }
      });
    });
  log.info(`Found ${mainCategories.length} main categories`);
  for (const mc of mainCategories) {
    await crawler.requestQueue.addRequest(mc);
  }
};

const MAIN_CATEGORY = async ({ $, request, crawler }) => {
  log.info(`START main categories ${request.url}`);
  const subcategories = [];
  $("nav.subcategory > ul")
    .children()
    .each(function () {
      const link = $(this).find(" > a");
      subcategories.push({
        url: `${tools.getRootUrl()}${link.attr("href")}`,
        userData: {
          label: LABELS.SUB_CATEGORY,
          mainCategory: request.userData.mainCategory,
          category: link.text(),
          level: 0
        }
      });
    });
  log.info(`Found ${subcategories.length} sub categories`);
  for (const mc of subcategories) {
    await crawler.requestQueue.addRequest(mc);
  }
};

const SUB_CATEGORY = async ({ $, crawler, request }) => {
  log.info(`Start sub categories ${request.url}`);
  const categories = [];
  const $highlightedCategories = $("li.Highlighted");
  if ($highlightedCategories.length > 0) {
    const subCategory = $highlightedCategories[request.userData.level];
    if ($(subCategory).find("ul").length !== 0) {
      $(subCategory)
        .find("ul > li")
        .each(function () {
          const link = $(this).find(" > a");
          const { level } = request.userData;
          categories.push({
            url: `${tools.getRootUrl()}${link.attr("href")}`,
            userData: {
              label: LABELS.SUB_CATEGORY,
              mainCategory: request.userData.mainCategory,
              category: `${request.userData.category} > ${link.text()}`,
              level: level + 1
            }
          });
        });
      log.info(`Found ${categories.length} categories`);
      for (const mc of categories) {
        await crawler.requestQueue.addRequest(mc);
      }
    } else {
      await tools.scrapProducts($, request, tools.getRootUrl());
    }
  } else {
    await tools.scrapProducts($, request, tools.getRootUrl());
  }
};

module.exports = {
  createRouter,
  START,
  MAIN_CATEGORY,
  SUB_CATEGORY
};
