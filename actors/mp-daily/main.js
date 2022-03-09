import Apify from "apify";
import { init, getCheerioObject } from "@hlidac-shopu/actors-common/scraper.js";
import { getJSONObject } from "@hlidac-shopu/actors-common/scraper";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

async function handleStart(crawlContext) {
  const { requestQueue, LABELS } = crawlContext;
  await requestQueue.addRequest({
    url: "https://www.mp.cz/",
    userData: {
      label: LABELS.CATEGORY
    }
  });
}

async function handleCategory(request, crawlContext) {
  const { requestQueue, proxyConfiguration, LABELS } = crawlContext;
  const $ = await getCheerioObject(request, proxyConfiguration);

  const test = $("#cms-app .mpHeader__megamenu");
  const categories = Array.from(
    test.html().matchAll(/v-bind:item-link="'(.*?)'"/g),
    x => `https://www.mp.cz${x[1]}`
  );
  for (const url of categories) {
    await requestQueue.addRequest({
      url,
      userData: {
        label: LABELS.SUB_CATEGORY
      }
    });
  }
}

async function handleSubCategory(request, crawlContext) {
  const { requestQueue, proxyConfiguration, LABELS } = crawlContext;
  const json = await getJSONObject(request, proxyConfiguration);
  const { categories } = json;
  if (categories && categories.length > 0) {
    for (const category of categories) {
      await requestQueue.addRequest(
        {
          url: `https://www.mp.cz/mp-catalogue/product-preview-by-component-id/12331?category=${category.seo_name}&page=1&search=&sort=nejdrazsi`,
          userData: {
            label: LABELS.LIST,
            category: category.seo_name,
            selectedPage: 1
          }
        },
        { forefront: false }
      );
    }
  }
}

async function handleList(request, crawlContext) {
  const { proxyConfiguration } = crawlContext;
  const json = await getJSONObject(request, proxyConfiguration);
  const { results } = json;
  if (results && results.length > 0) {
    const { pagesCount } = results;
    console.log(pagesCount);
  }
}

Apify.main(async () => {
  rollbar.init();
  const crawlContext = await init();
  const { input, requestQueue, log, LABELS } = crawlContext;

  // Add first urls to scrape.
  await handleStart(crawlContext);

  const { maxConcurrency, maxRequestRetries } = input;
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    handleRequestFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;

      log.info(`Handle ${request.url} with label: ${label}`);
      switch (label) {
        case LABELS.CATEGORY:
          //Handle scraping category urls on page
          await handleCategory(request, crawlContext);
          break;
        case LABELS.SUB_CATEGORY:
          //Handle scraping subcategory urls on page
          await handleSubCategory(request, crawlContext);
          break;
        case LABELS.LIST:
          //Handle scraping items on list
          await handleList(request, crawlContext);
          break;
        case LABELS.DETAIL:
          //Handle scraping item on detail page
          break;
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });
  // Run crawler.
  await crawler.run();
});
