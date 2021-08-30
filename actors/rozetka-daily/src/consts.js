const ACTOR_TYPES = {
  DAILY: "DAILY",
  COUNT: "COUNT"
};

const LABELS = {
  MAIN_PAGE: "MAIN_PAGE",
  CATEGORY_OR_PRODUCTS: "CATEGORY_OR_PRODUCTS"
};

const { MAIN_PAGE, CATEGORY_OR_PRODUCTS } = LABELS;

const MAX_PAGE_COUNT = 67;

const CURRENCY = "UAH";

const MAIN_DOMAIN = "rozetka.com.ua/";

const BAD_HARDWARE_PAGE_URL = "https://hard.rozetka.com.ua/";
const GOOD_HARDWARE_PAGE_URL = "https://hard.rozetka.com.ua/hard/c80026/";

const PRODUCT_LIST_NEXT_PAGE_SELECTOR =
  ".pagination__direction_type_forward[href]";

const CATEGORY_PSEUDO_URLS = [`[.*]${MAIN_DOMAIN}[.*(?:\\w|-)*]/c[.*]`];

const PRODUCT_CELL_SELECTOR = ".catalog-grid__cell";

const CATEGORY_CELL_SELECTOR =
  ".tile-cats__heading, li.portal-grid__cell rz-image-tile > a, rz-widget-tabs:nth-child(2) .portal-cats__list a";

const CATEGORY_LIST_ITEM_SELECTOR = ".breadcrumbs span";

const RESTAURANTS_CAT_URL =
  "https://rozetka.com.ua/restorani-i-produktovie-seti/c4660651/";
const GAMER_GIFTS_URL =
  "https://rozetka.com.ua/podarki-dlya-geymerov/c4629541/";
const CELEBRATION_GOODS =
  "https://rozetka.com.ua/podarki-i-tovary-dlya-prazdnikov/c80260/";

const GAMER_GOODS_URL = "https://rozetka.com.ua/game-zone/c80261/";
const RESTAURANT_GOODS_URL =
  "https://rozetka.com.ua/restorani-i-produktovie-seti/c4660651/";

const START_REQUESTS = [
  { url: `https://${MAIN_DOMAIN}`, userData: { label: MAIN_PAGE } },
  { url: CELEBRATION_GOODS, userData: { label: CATEGORY_OR_PRODUCTS } },
  { url: GAMER_GIFTS_URL, userData: { label: CATEGORY_OR_PRODUCTS } },
  { url: RESTAURANTS_CAT_URL, userData: { label: CATEGORY_OR_PRODUCTS } }
];

const STATS_KEY = "stats";

module.exports = {
  ACTOR_TYPES,
  LABELS,
  MAX_PAGE_COUNT,
  CURRENCY,
  MAIN_DOMAIN,
  BAD_HARDWARE_PAGE_URL,
  GOOD_HARDWARE_PAGE_URL,
  PRODUCT_LIST_NEXT_PAGE_SELECTOR,
  CATEGORY_PSEUDO_URLS,
  PRODUCT_CELL_SELECTOR,
  CATEGORY_CELL_SELECTOR,
  CATEGORY_LIST_ITEM_SELECTOR,
  RESTAURANTS_CAT_URL,
  GAMER_GIFTS_URL,
  CELEBRATION_GOODS,
  GAMER_GOODS_URL,
  RESTAURANT_GOODS_URL,
  START_REQUESTS,
  STATS_KEY
};
