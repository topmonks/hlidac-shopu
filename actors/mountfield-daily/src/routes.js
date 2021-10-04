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
  const categoryItems = $(".list-categories__item__block").toArray();
  for (const cat of categoryItems) {
    const url = $(cat).attr("href");
    await crawler.requestQueue.addRequest({
      url,
      userData: {
        label: LABELS.CATEGORY,
        mainCategory: $(cat).find("h3").text()?.trim()
      }
    });
  }
};

const CATEGORY = async ({ $, request, crawler }) => {
  let categories = $(".list-categories__item__block").toArray();
  if (categories.length === 0) {
    categories = $(".list-categories-with-article__box").toArray();
  }
  if (categories.length === 0) {
    await tools.scrapProducts($, request, tools.getRootUrl());
  } else {
    const { mainCategory } = request.userData;
    for (const cat of categories) {
      const url = $(cat).attr("href");
      await crawler.requestQueue.addRequest({
        url,
        userData: {
          label: LABELS.CATEGORY,
          mainCategory
        }
      });
    }
  }
};

module.exports = {
  createRouter,
  START,
  CATEGORY
};
