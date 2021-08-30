const Apify = require("apify");

const { PRODUCT_LIST_NEXT_PAGE_SELECTOR } = require("../../consts.js");

const {
  utils: { log }
} = Apify;

const handlePagination = async ($, url, requestQueue, userData) => {
  const nextPageLink = $(PRODUCT_LIST_NEXT_PAGE_SELECTOR).attr("href");

  // case when there is a button 'next page'
  if (nextPageLink) {
    log.debug(`current product list page ${url} has next page ${nextPageLink}`);

    await requestQueue.addRequest({
      url: new URL(nextPageLink, url).href,
      userData
    });
  }
};

module.exports = {
  handlePagination
};
