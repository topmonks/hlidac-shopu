import Apify from "apify";
import { LABELS, MAIN_DOMAIN } from "../consts.js";

const {
  utils: { log }
} = Apify;
const { CATEGORY_OR_PRODUCTS } = LABELS;

/** @type {Apify.CheerioHandlePage} */
export async function handleMainPage(context) {
  const {
    $,
    request: { loadedUrl },
    crawler: { requestQueue }
  } = context;
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
}

module.exports = {
  handleMainPage
};
