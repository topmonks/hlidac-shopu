import Apify from "apify";

const {
  utils: { log }
} = Apify;

export async function enqueueLastPage($, url, requestQueue, userData) {
  const lastPageLink = $("li.pagination__item:last-child a").attr("href");

  log.debug(`current product list page ${url} has last page ${lastPageLink}`);

  await requestQueue.addRequest({
    url: new URL(lastPageLink, url).href,
    userData
  });
}
