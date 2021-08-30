const Apify = require("apify");
const { MAIN_DOMAIN, LABELS } = require("../consts.js");

const {
  utils: { log }
} = Apify;
const { CATEGORY_OR_PRODUCTS } = LABELS;

/** @type {Apify.CheerioHandlePage} */
const handleMainPage = async ({
  $,
  request: { loadedUrl },
  crawler: { requestQueue }
}) => {
  log.info("Entered main page.");

  await Apify.utils.enqueueLinks({
    $,
    requestQueue,
    baseUrl: loadedUrl,
    selector: ".menu-wrapper_state_static .menu-categories__link",
    pseudoUrls: [
      `[.*]${MAIN_DOMAIN}[(?:\\w|-)*]/c[.*]`,
      `https://bt.${MAIN_DOMAIN}[.*]`
    ],
    transformRequestFunction: req => {
      req.userData = {
        label: CATEGORY_OR_PRODUCTS
      };

      return req;
    }
  });
};

module.exports = {
  handleMainPage
};
