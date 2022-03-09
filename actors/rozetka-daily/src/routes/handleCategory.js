import Apify from "apify";
import { CATEGORY_CELL_SELECTOR, LABELS } from "../consts.js";

const {
  utils: { log }
} = Apify;
const { CATEGORY_OR_PRODUCTS } = LABELS;

/** @type {Apify.CheerioHandlePage} */
export async function handleCategory(context) {
  const {
    $,
    request: { loadedUrl },
    crawler: { requestQueue }
  } = context;
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
}
