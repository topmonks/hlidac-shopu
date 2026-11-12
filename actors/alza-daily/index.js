import { HttpCrawler } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice, itemSlug } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, Dataset, log } from "apify";

/** @enum {string} */
const Labels = {
  FLOORS: "FLOORS",
  CATEGORY: "CATEGORY",
  CHILDREN: "CHILDREN",
  PAGE: "PAGE",
  DETAIL: "DETAIL"
};

// The API serves the mobile app only, a browser user agent gets a Cloudflare 403.
const API = "services/restservice.svc";
const USER_AGENT = "okhttp/4.12.0;unknown/Generic_Android-x86_64;13;en_GB;2025.17.0;436;0;cz.alza.eshop";
const PAGE_SIZE = 25;
// "Nejnovější". The default order mixes sponsored products into the listing.
const ORDER_BY_NEWEST = 5;
// Pračky
const TEST_CATEGORY_ID = 18852774;
const HANDLED_IDS_KEY = "HANDLED_PRODUCT_IDS";
const MAX_FAILED_RATIO = 0.05;

// `inStock` matches "Skladem > 5 ks", "Skladem u dodavatele" and "Rozbaleno - skladem 1 ks",
// but not "Na objednávku", "Na cestě" or "Očekáváme".
// `priceDecimals` is the precision of the displayed price, "36 117,-" or "448,90 €".
const shops = {
  CZ: {
    origin: "https://www.alza.cz",
    language: "cs-CZ",
    currency: "CZK",
    priceDecimals: 0,
    inStock: /skladem/i,
    tableName: "alza"
  },
  SK: {
    origin: "https://www.alza.sk",
    language: "sk-SK",
    currency: "EUR",
    priceDecimals: 2,
    inStock: /na sklade/i,
    tableName: "alza_sk"
  }
};

function apiRequest({ shop, country, path, label, uniqueKey, userData, payload }) {
  return {
    url: `${shop.origin}/${path}${path.includes("?") ? "&" : "?"}country=${country}`,
    method: payload ? "POST" : "GET",
    payload: payload && JSON.stringify(payload),
    headers: {
      "user-agent": USER_AGENT,
      "accept": "application/json",
      "accept-language": shop.language,
      "content-type": "application/json; charset=utf-8"
    },
    uniqueKey,
    userData: { label, ...userData }
  };
}

function floorsRequest(options) {
  return apiRequest({ ...options, path: `${API}/v1/floors`, label: Labels.FLOORS, uniqueKey: "floors" });
}

function childrenRequest({ categoryId, section = false, ...options }) {
  return apiRequest({
    ...options,
    path: `${API}/v1/category/${categoryId}?t=CATEGORY&p=0`,
    label: Labels.CHILDREN,
    uniqueKey: `children-${categoryId}`,
    userData: { categoryId, section }
  });
}

/**
 * The first page of a listing decides whether the listing is paginated, see `isOwnListing`.
 * @param {{categoryId: number, via?: number, forced?: boolean}} options `via` is the category which links here as related
 */
function categoryRequest({ categoryId, via, forced = false, ...options }) {
  return {
    ...productsRequest({ ...options, categoryId, page: 1 }),
    uniqueKey: via ? `products-${categoryId}-1-via-${via}` : `products-${categoryId}-1`,
    userData: { label: Labels.CATEGORY, categoryId, via, forced }
  };
}

function productsRequest({ categoryId, page, ...options }) {
  return apiRequest({
    ...options,
    path: `${API}/v2/products?categoryId=${categoryId}`,
    label: Labels.PAGE,
    uniqueKey: `products-${categoryId}-${page}`,
    userData: { categoryId, page },
    payload: {
      filterParameters: {
        id: categoryId,
        type: "CATEGORY",
        typeId: 0,
        orderBy: ORDER_BY_NEWEST,
        page,
        availabilityType: 0,
        selectedBranches: [],
        sendPrices: false,
        params: [],
        producers: [],
        useRatingThreshold: false
      }
    }
  });
}

/**
 * The product detail, the same one the product page shows.
 * @param {{product: object}} options `product` is the product of a listing, see `productsFromListing`
 */
function detailRequest({ product, ...options }) {
  return apiRequest({
    ...options,
    path: `api/router/legacy/catalog/product/${product.itemId}`,
    label: Labels.DETAIL,
    uniqueKey: `detail-${product.itemId}`,
    userData: { product }
  });
}

/**
 * @param {string | undefined} href
 * @returns {number | null}
 */
function categoryIdFromHref(href) {
  const id = href?.match(/\/categor(?:y|ies)\/(\d+)/)?.[1];
  return id ? Number(id) : null;
}

/**
 * Subcategories of a floor, a section or a category. The lists also carry promo listings
 * (`MAILINGACTION`, `ACTION`, `BOOST`) and articles (`WIZARD`), their products are in the categories too.
 * The category is the one in `self.href`, `id` is the id of the menu entry.
 * - `section` lists no products, only subcategories (Počítače a notebooky)
 * - `related` category is shown next to the subcategories, but its products are not in the parent listing
 *   (Příslušenství in Notebooky). Products of the other subcategories are (Herní in Notebooky).
 * @returns {{id: number, section: boolean, related: boolean}[]}
 */
export function childCategories(json) {
  const categories = new Map();
  for (const x of json.data ?? []) {
    if (x.cat_type !== "CATEGORY") continue;
    const id = categoryIdFromHref(x.self?.href);
    if (!id) continue;
    // a category listed as both is not in the parent listing
    const related = x.type !== "sub" || Boolean(categories.get(id)?.related);
    categories.set(id, { id, section: x.self.appLink !== "catalogCategory", related });
  }
  return [...categories.values()];
}

/**
 * A listing contains the products of its subcategories, so only two kinds of listings are paginated:
 * the topmost one below the sections, and a related category reached from its own parent. A related
 * category is linked from many places, the parent is the one before it in the breadcrumbs.
 * @param {object} json
 * @param {number=} via category which links to the listing as related
 */
export function isOwnListing(json, via) {
  const parent = (json.breadcrumbs ?? []).at(-2)?.category;
  if (parent?.clientAction?.appLink !== "catalogCategory") return true;
  return categoryIdFromHref(parent.meta?.href ?? parent.clientAction.href) === via;
}

/**
 * @param {number} total
 */
export function pagesCount(total) {
  return Math.ceil(total / PAGE_SIZE);
}

// `variant_type` of a product which stands for all its variants, "Skladem dle varianty"
const VARIANTS = 1;

// `type` of the offer "Koupit s kódem X" in `cashBackItems`. The other offers are a cashback,
// a trade-in bonus and the price for the members of AlzaPlus+.
const DISCOUNT_CODE = 2;

/**
 * Price and availability of a product of a listing or of a product detail, the same rule
 * as in `extension/shops/alza.mjs`: the price with a discount code is the current one.
 * The price of one piece is `priceNoCurrency`, which is not rounded (36 116.5 for "36 117,-").
 * The displayed `price` of a product with a quantity discount is the lowest one ("od 189,-" for 199.0).
 * @param {object} item
 * @param {object} shop
 */
function offer(item, shop) {
  const scale = 10 ** shop.priceDecimals;
  const mainPrice = Math.round(item.priceNoCurrency * scale) / scale;
  const comparePrice = cleanPrice(item.cprice);
  const codePrice = cleanPrice(item.cashBackItems?.find(x => x.type === DISCOUNT_CODE)?.price);
  const couponPrice = codePrice && codePrice < mainPrice ? codePrice : null;
  const currentPrice = couponPrice ?? mainPrice;
  const formerPrice = couponPrice ? (comparePrice ?? mainPrice) : comparePrice;
  // an original price which is not higher would draw a discount that is not there
  const originalPrice = formerPrice !== null && formerPrice > currentPrice ? formerPrice : null;
  return {
    inStock: shop.inStock.test(item.avail ?? ""),
    currentPrice,
    originalPrice,
    discounted: originalPrice !== null
  };
}

/**
 * Products of a listing page which were not saved yet. A product that cannot be bought
 * ("Momentálně nedostupné") often has no displayed price, such a product is skipped.
 *
 * A product with variants is listed with the price of its cheapest variant ("od 109,-"), but its
 * page shows another variant (203,-). Such products are returned in `withVariants`, their price is
 * in the product detail, see `productWithVariants`.
 * @param {{json: object, shop: object, handledIds: Set<number>}} options
 */
export function productsFromListing({ json, shop, handledIds }) {
  const breadCrumbs = (json.breadcrumbs ?? []).map(x => x.category.name).join(" > ");
  const products = [];
  const withVariants = [];
  for (const item of json.data ?? []) {
    if (handledIds.has(item.id)) continue;
    handledIds.add(item.id);
    if (!item.price || !item.priceNoCurrency) continue;
    const { inStock, ...prices } = offer(item, shop);
    const product = {
      itemId: String(item.id),
      itemName: item.name,
      itemUrl: item.url,
      slug: itemSlug(item.url),
      img: item.img,
      inStock,
      ...prices,
      currency: shop.currency,
      itemCode: item.code,
      rating: item.rating,
      breadCrumbs
    };
    if (item.variant_type === VARIANTS) withVariants.push(product);
    else products.push(product);
  }
  return { products, withVariants };
}

/**
 * Product with variants with the price its page shows. The product detail of such a product
 * is the detail of the variant which the page selects.
 * @param {{product: object, json: object, shop: object}} options `json` is the product detail
 * @returns {object | null}
 */
export function productWithVariants({ product, json, shop }) {
  const variant = json.data;
  if (!variant?.price || !variant.priceNoCurrency) return null;
  return { ...product, ...offer(variant, shop) };
}

/**
 * Ids of saved products, kept over migrations. The catalogue has hundreds of thousands of products,
 * so they are stored as a binary array of 32bit integers instead of a JSON object.
 * @returns {Promise<Set<number>>}
 */
async function useHandledIds() {
  const stored = await Actor.getValue(HANDLED_IDS_KEY);
  const handledIds = new Set(stored ? new Uint32Array(Uint8Array.from(stored).buffer) : []);
  const persist = () =>
    Actor.setValue(HANDLED_IDS_KEY, Buffer.from(Uint32Array.from(handledIds).buffer), {
      contentType: "application/octet-stream"
    });
  Actor.on("persistState", persist);
  Actor.on("migrating", persist);
  return handledIds;
}

export async function main() {
  rollbar.init();

  const {
    development,
    proxyGroups,
    maxRequestRetries,
    type = ActorType.Full,
    country = "CZ",
    ...input
  } = await getInput();
  const shop = shops[country];
  if (!shop) throw new Error(`Unsupported country ${country}`);
  const categoryIds = input.categoryIds ?? (type === ActorType.Test ? [TEST_CATEGORY_ID] : []);

  const stats = await withPersistedStats({
    urls: 0,
    categories: 0,
    items: 0,
    failed: 0
  });
  const handledIds = await useHandledIds();

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  async function saveProducts(json) {
    if (!Array.isArray(json.data)) throw new Error("Listing has no products - API changed");
    const { products, withVariants } = productsFromListing({ json, shop, handledIds });
    await crawler.addRequests(withVariants.map(product => detailRequest({ shop, country, product })));
    await Dataset.pushData(products);
    stats.add("items", products.length);
  }

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 1200,
    persistCookiesPerSession: false,
    preNavigationHooks: [
      (_, gotOptions) => {
        // browser headers do not belong to the mobile app
        gotOptions.useHeaderGenerator = false;
      }
    ],
    async requestHandler({ crawler, request, json }) {
      const { label, categoryId, section, via, forced, product } = request.userData;
      if (!json) throw new Error(`[${label}] ${request.url} did not return JSON`);
      const options = { shop, country };

      switch (label) {
        case Labels.FLOORS:
        case Labels.CHILDREN: {
          const categories = childCategories(json);
          if (label === Labels.FLOORS && !categories.length) throw new Error("No categories in floors - API changed");
          const fromSection = label === Labels.FLOORS || section;
          await crawler.addRequests(
            categories.map(x => {
              if (x.section) return childrenRequest({ ...options, categoryId: x.id, section: true });
              if (fromSection) return categoryRequest({ ...options, categoryId: x.id });
              if (x.related) return categoryRequest({ ...options, categoryId: x.id, via: categoryId });
              // its products are in the parent listing, but it can have related categories
              return childrenRequest({ ...options, categoryId: x.id });
            })
          );
          break;
        }
        case Labels.CATEGORY: {
          // a section given in the input lists no products and has no breadcrumbs
          const isSection = !json.total && !json.breadcrumbs?.length;
          // a category linked from elsewhere is crawled from its own parent
          if (!forced && !isSection && !isOwnListing(json, via)) break;
          await crawler.addRequests([childrenRequest({ ...options, categoryId, section: isSection })]);
          if (!json.total) break;
          stats.inc("categories");
          const pages = pagesCount(json.total);
          log.info(`[${label}] ${categoryId} has ${json.total} products on ${pages} pages`);
          const requests = [];
          for (let i = 2; i <= pages; i++) {
            requests.push(productsRequest({ ...options, categoryId, page: i }));
          }
          await crawler.addRequests(requests);
          await saveProducts(json);
          break;
        }
        case Labels.PAGE:
          await saveProducts(json);
          break;
        case Labels.DETAIL: {
          const withPrice = productWithVariants({ product, json, shop });
          if (!withPrice) break;
          await Dataset.pushData(withPrice);
          stats.inc("items");
          break;
        }
      }
      stats.inc("urls");
    },
    failedRequestHandler({ request }, error) {
      log.error(`Request ${request.uniqueKey} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const options = { shop, country };
  await crawler.run(
    categoryIds.length
      ? categoryIds.map(categoryId => categoryRequest({ ...options, categoryId, forced: true }))
      : [floorsRequest(options)]
  );

  const { urls, items, failed } = stats.get();
  log.info(`Saved ${items} products from ${urls} requests, ${failed} requests failed`);
  // a blocked run must not look like a successful one
  if (!items) throw new Error("No products scraped");

  if (!development) {
    try {
      await uploadToKeboola(shop.tableName);
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }

  if (failed > (urls + failed) * MAX_FAILED_RATIO) {
    throw new Error(`${failed} of ${urls + failed} requests failed, the data is incomplete`);
  }
}
