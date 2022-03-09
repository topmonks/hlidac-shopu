import Apify from "apify";
import { LABELS } from "./const.js";
import tools from "./tools.js";

const {
  utils: { log }
} = Apify;

// Create router
export const createRouter = globalContext => {
  return async function (routeName, requestContext) {
    const route = routes[routeName];
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
  const { mainCategory } = request.userData;
  let categories = $(".list-categories__item__block").toArray();
  if (categories.length === 0) {
    categories = $(".list-categories-with-article__box").toArray();
  }
  if (categories.length === 0) {
    await tools.scrapProducts($, request);
    const nextPagination = $("a.in-paging__control__item--arrow-next");
    if (nextPagination.length > 0) {
      const paginationUrl = `https://mountfield.${global.userInput.country.toLocaleLowerCase()}${nextPagination.attr(
        "href"
      )}`;
      await crawler.requestQueue.addRequest({
        url: paginationUrl,
        userData: {
          label: LABELS.CATEGORY,
          mainCategory
        }
      });
      log.info(`Found pagination page ${paginationUrl}`);
    }
  } else {
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
    log.info(`Found categories ${categories.length}`);
  }
};

const routes = {
  START,
  CATEGORY
};
