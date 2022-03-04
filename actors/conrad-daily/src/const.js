//const URL_API_START = "https://www.conrad.cz/restservices/CZ/megamenu";
const URL_API_START = "https://www.conrad.cz";

const URL_TEMPLATE_CATEGORY = "https://www.conrad.cz/restservices/CZ/megamenu";

const URL_TEMPLATE_PRODUCT_LIST =
  "https://api.conrad.com/search/1/v3/facetSearch/CZ/cs/b2c?apikey={APIKEY}";

const URL_TEMPLATE_PRODUCT = "https://luxor.cz/product/{SLUG}";

const URL_TEMPLATE_PAGE_URL = "https://luxor.cz/products/{SLUG}?page={PAGE}";

const URL_IMAGE_BASE = "https://cdn.luxor.cz/";

const URL_FRONT = "https://www.conrad.cz";

const URL_SITEMAP = "https://www.conrad.cz/sitemap.xml";

const PRODUCTS_PER_PAGE = 24;

const LABELS = {
  API_START: "API-START",
  API_LIST: "API-LIST",
  API_DETAIL: "API-DETAIL",

  FRONT_START: "FRONT-START",
  FRONT_LIST: "FRONT-LIST",
  FRONT_DETAIL: "FRONT-DETAIL",

  SITEMAP_START: "SITEMAP-START",
  SITEMAP_LIST: "SITEMAP-LIST"
};

module.exports = {
  URL_API_START,
  URL_TEMPLATE_CATEGORY,
  URL_TEMPLATE_PRODUCT_LIST,
  URL_TEMPLATE_PRODUCT,
  URL_TEMPLATE_PAGE_URL,
  URL_IMAGE_BASE,
  URL_FRONT,
  URL_SITEMAP,
  PRODUCTS_PER_PAGE,
  LABELS
};
