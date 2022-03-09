export const ACTOR_TYPES = {
  DAILY: "DAILY",
  COUNT: "COUNT"
};

export const LABELS = {
  MAIN_PAGE: "MAIN_PAGE",
  CATEGORY_OR_PRODUCTS: "CATEGORY_OR_PRODUCTS"
};

export const { MAIN_PAGE, CATEGORY_OR_PRODUCTS } = LABELS;

export const MAX_PAGE_COUNT = 67;

export const CURRENCY = "UAH";

export const MAIN_DOMAIN = "rozetka.com.ua/";

export const BAD_HARDWARE_PAGE_URL = "https://hard.rozetka.com.ua/";
export const GOOD_HARDWARE_PAGE_URL =
  "https://hard.rozetka.com.ua/hard/c80026/";

export const PRODUCT_LIST_NEXT_PAGE_SELECTOR =
  ".pagination__direction_type_forward[href]";

export const CATEGORY_PSEUDO_URLS = [`[.*]${MAIN_DOMAIN}[.*(?:\\w|-)*]/c[.*]`];

export const PRODUCT_CELL_SELECTOR = ".catalog-grid__cell";

export const CATEGORY_CELL_SELECTOR =
  ".tile-cats__heading, li.portal-grid__cell rz-image-tile > a, rz-widget-tabs:nth-child(2) .portal-cats__list a";

export const CATEGORY_LIST_ITEM_SELECTOR = ".breadcrumbs span";

export const RESTAURANTS_CAT_URL =
  "https://rozetka.com.ua/restorani-i-produktovie-seti/c4660651/";
export const GAMER_GIFTS_URL =
  "https://rozetka.com.ua/podarki-dlya-geymerov/c4629541/";
export const CELEBRATION_GOODS =
  "https://rozetka.com.ua/podarki-i-tovary-dlya-prazdnikov/c80260/";

export const GAMER_GOODS_URL = "https://rozetka.com.ua/game-zone/c80261/";
export const RESTAURANT_GOODS_URL =
  "https://rozetka.com.ua/restorani-i-produktovie-seti/c4660651/";

export const START_REQUESTS = [
  { url: `https://${MAIN_DOMAIN}`, userData: { label: MAIN_PAGE } },
  { url: CELEBRATION_GOODS, userData: { label: CATEGORY_OR_PRODUCTS } },
  { url: GAMER_GIFTS_URL, userData: { label: CATEGORY_OR_PRODUCTS } },
  { url: RESTAURANTS_CAT_URL, userData: { label: CATEGORY_OR_PRODUCTS } }
];

export const STATS_KEY = "stats";
