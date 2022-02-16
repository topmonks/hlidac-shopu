const URL_MAIN =
  //"https://www.luxor.cz/products/knihy?sort=price%3Aasc&only_in_stock=1";
  "https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1";

const URL_TEMPLATE_CATEGORY =
  "https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1";

const URL_TEMPLATE_PRODUCT_LIST =
  "https://mw.luxor.cz/api/v1/products?page={PAGE}&size={PRODUCTS_PER_PAGE}&sort=revenue%3Adesc&filter%5Bcategory%5D={SLUG}";

const URL_TEMPLATE_PRODUCT = "https://www.luxor.cz/product/{SLUG}";

const URL_TEMPLATE_PAGE_URL = "https://www.luxor.cz/products/knihy?page={PAGE}";

const URL_IMAGE_BASE = "https://cdn.luxor.cz/";

const PRODUCTS_PER_PAGE = 24;

module.exports = {
  URL_MAIN,
  URL_TEMPLATE_CATEGORY,
  URL_TEMPLATE_PRODUCT_LIST,
  URL_TEMPLATE_PRODUCT,
  URL_TEMPLATE_PAGE_URL,
  URL_IMAGE_BASE,
  PRODUCTS_PER_PAGE
};
