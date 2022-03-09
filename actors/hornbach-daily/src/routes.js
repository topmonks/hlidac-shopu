import Apify from "apify";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import { LABELS, API_URL, PRICE_HEADER } from "./const";
import { siteMapToLinks, getCategoryId, getCategories } from "./tools.js";

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

const SITE = async ({ body, crawler }) => {
  const { country } = global.userInput;
  log.info("START with main page");
  const links = siteMapToLinks(body);
  for (const link of links) {
    const id = getCategoryId(link);
    await crawler.requestQueue.addRequest(
      {
        url: API_URL(country, id),
        userData: {
          label: LABELS.CATEGORY,
          categoryId: id,
          link
        }
      },
      { forefront: true }
    );
  }
};

const CATEGORY = async ({ request, json, crawler }) => {
  const { s3 } = global;
  const { country } = global.userInput;
  const { pageNumber, pageCount, articles } = json;
  if (pageNumber === 1) {
    const {
      userData: { categoryId }
    } = request;
    for (let i = 2; i <= pageCount; i++) {
      await crawler.requestQueue.addRequest({
        url: API_URL(country, categoryId, i),
        userData: {
          label: LABELS.CATEGORY,
          categoryId,
          page: i
        }
      });
    }
  }
  if (articles.length > 0) {
    const requests = [];
    const codes = articles.map(a => a.articleCode);
    const { body } = await requestAsBrowser({
      url: `https://www.hornbach.${country}/mvc/article/displaystates-and-prices.json`,
      method: "POST",
      json: true,
      useHttp2: true,
      headers: PRICE_HEADER,
      payload: JSON.stringify(codes)
    });
    for (const article of articles) {
      let currentPrice = article.allPrices.displayPrice.price.replace(",", ".");
      const result = {
        itemId: article.articleCode,
        itemUrl: `https://www.hornbach.${country}${article.localizedExternalArticleLink}`,
        itemName: article.title,
        currency: article.allPrices.displayPrice.currency,
        img: article.imageUrl,
        currentPrice: parseFloat(currentPrice),
        originalPrice: null,
        discounted: false,
        category: getCategories(article.categoryPath)
      };
      const price = body.filter(p => p.articleCode === article.articleCode);
      if (price) {
        const { allPrices } = price[0];
        let { displayPrice, guidingPrice } = allPrices;
        if (guidingPrice) {
          displayPrice = displayPrice.price.replace(",", ".");
          guidingPrice = guidingPrice.price.replace(",", ".");
          result.currentPrice = parseFloat(displayPrice);
          result.discounted = true;
          result.originalPrice = parseFloat(guidingPrice);
        }
      }
      requests.push(
        Apify.pushData(result),
        uploadToS3v2(
          s3,
          {
            ...result,
            inStock: true
          },
          { priceCurrency: result.currency }
        )
      );
    }
    await Promise.all(requests);
  }
};

module.exports = {
  createRouter,
  SITE,
  CATEGORY
};
