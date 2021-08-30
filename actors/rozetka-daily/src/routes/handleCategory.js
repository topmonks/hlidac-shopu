const Apify = require("apify");
const { LABELS, CATEGORY_CELL_SELECTOR } = require("../consts.js");

const {
  utils: { log }
} = Apify;
const { CATEGORY_OR_PRODUCTS } = LABELS;

/** @type {Apify.CheerioHandlePage} */
const handleCategory = async ({
  $,
  request: { loadedUrl },
  crawler: { requestQueue }
}) => {
  log.info(`Entered Category page: ${loadedUrl}`);

  await Apify.utils.enqueueLinks({
    $,
    requestQueue,
    baseUrl: loadedUrl,
    selector: CATEGORY_CELL_SELECTOR,
    transformRequestFunction: req => {
      req.userData = {
        label: CATEGORY_OR_PRODUCTS
      };

      return req;
    }
  });
};

module.exports = {
  handleCategory
};
