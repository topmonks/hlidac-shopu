const LABELS = {
  START: "START",
  PRODUCTS: "PRODUCTS",
  BF: "BF"
};

const SCRIPT_WITH_JSON = {
  PREFIX: "window.__INITIAL_STATE__=",
  POSTFIX:
    ";(function(){var s;(s=document.currentScript||document.scripts[document.scripts.length-1]).parentNode.removeChild(s);}());",
  UNDEFINED: "undefined"
};

const PRODUCTS_PER_PAGE = 55;
const PRODUCTS_URLS = {
  PRODUCTS_PAGE: "https://www.prozdravi.cz/produkty/",
  BF_PRODUCTS_PAGE: "https://www.prozdravi.cz/green-friday-produkty/",
  ITEM_PREFIX: "https://www.prozdravi.cz"
};
module.exports = {
  LABELS,
  SCRIPT_WITH_JSON,
  PRODUCTS_PER_PAGE,
  PRODUCTS_URLS
};
