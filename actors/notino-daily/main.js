import { HttpCrawler, useState } from "@crawlee/http";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { Actor, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/**
 * WHY THIS ACTOR IS SITEMAP-DRIVEN (see GH #3587)
 * -----------------------------------------------
 * Notino CZ used to be crawled by walking the homepage mega-menu -> category pages -> following the
 * `rel="next"` pagination link on each category. That collapsed to ~8K of ~90K products.
 *
 * Root cause (verified live via got-scraping through Apify Proxy, all proxy tiers): category page 1
 * loads fine and `rel="next"` IS found, but the paginated `...?f=<...>` URLs return **403 from
 * Cloudflare Bot Management** (`__cf_bm` cookie). This is true on RESIDENTIAL, datacenter, and
 * country-DC groups alike, and a homepage cookie warm-up on a pinned IP does NOT clear it. So
 * pagination dies at page 1 of every category -> only the first ~28 products per category are seen.
 * There is no JSON listing API to fall back to - the product grid is server-rendered in that same
 * Cloudflare-gated `?f=` HTML.
 *
 * The fix: discover products from Notino's own **sitemap** instead of category pagination. The
 * sitemap index (`/sitemap.xml`) links per-category product sitemaps
 * (`sitemap_detail_{parfemy,plet,telo,vlasy,makeup,zdravi,...}_cz.xml`) that together list ~63K
 * unique product-detail URLs, refreshed daily (`<lastmod>` = today). Product **detail** pages are
 * NOT Cloudflare-gated - they return `__APOLLO_STATE__` over plain HTTP - so the existing detail
 * parser works unchanged. 63K product pages x ~1.5-2 variants each => ~90K item rows = the expected
 * volume. This is strictly more complete than the old category walk and avoids the `?f=` wall
 * entirely.
 *
 * Black Friday still uses the old CATEGORY_PAGE/pagination path (seasonal, out of scope for #3587);
 * it likely hits the same Cloudflare wall and should be revisited before November.
 * The retired homepage-menu discovery (`homepageRequests`) is in this file's git history.
 */

/** @enum {string} */
const Labels = {
  SITEMAP_INDEX: "SITEMAP_INDEX",
  PRODUCT_SITEMAP: "PRODUCT_SITEMAP",
  CATEGORY_PAGE: "CATEGORY_PAGE",
  DETAIL_PAGE: "DETAIL_PAGE",
  COUNT: "COUNT",
  COUNT_PRODUCT: "COUNT_PRODUCT",
  BF: "BF"
};

const SITEMAP_URL_CZ = "https://www.notino.cz/sitemap.xml";
const SITEMAP_URL_SK = "https://www.notino.sk/sitemap.xml";
const BASE_URL = "https://www.notino.cz";
const BASE_URL_SK = "https://www.notino.sk";
const BASE_URL_CZ_BF = "https://www.notino.cz/black-friday/";
const BASE_URL_SK_BF = "https://www.notino.sk/black-friday/";

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/**
 * @param {Country} country
 */
function getRootUrl(country) {
  return !country || country === Country.CZ ? BASE_URL : BASE_URL_SK;
}

/**
 * @param {Country} country
 */
function getSitemapUrl(country) {
  return !country || country === Country.CZ ? SITEMAP_URL_CZ : SITEMAP_URL_SK;
}

/**
 * Sub-sitemaps that hold product-detail URLs. Excludes the `reviews` sitemaps (those are `/recenze/`
 * pages, not products). The per-category and the `*_images_*` sitemaps overlap - the request queue
 * dedupes the URLs, so enqueuing all of them is safe and maximises coverage.
 * @param {string} url
 */
function isProductDetailSitemap(url) {
  return url.includes("sitemap_detail") && !url.includes("reviews");
}

function determineCurrentAndOriginalPrice(variantGeneralData) {
  // Data contain following prices
  const voucherDiscountedPrice =
    variantGeneralData.attributes?.VoucherDiscount?.discountedPrice ??
    variantGeneralData.attributes?.ConditionalVoucherDiscount?.discountConditions?.find(c => c.productMeetsCondition)
      ?.discountedPrice;
  const price = variantGeneralData.price.value;
  const originalPrice = variantGeneralData.originalPrice?.value;
  const recentMinPrice = variantGeneralData.recentMinPrice?.value;

  // Some products are automatically discounted using vouchers available for everyone.
  // In this case, we should take it as the current price, and return the price without voucher as original price
  if (voucherDiscountedPrice) {
    return {
      currentPrice: voucherDiscountedPrice,
      originalPrice: recentMinPrice ?? price
    };
  }

  // Otherwise price is current price, and original price becomes trickier.
  return {
    currentPrice: price,
    originalPrice:
      recentMinPrice && price < recentMinPrice && recentMinPrice < originalPrice ? recentMinPrice : originalPrice
  };
}

/**
 * @param {Document} document
 * @param {Country} country
 */
function handleProductUsingWindowObject(document, country) {
  log.debug("Handled by windowObject");
  const dataStringFromScriptTag = document.querySelector("#__APOLLO_STATE__")?.innerHTML;
  const productData = JSON.parse(dataStringFromScriptTag.replace(/;/g, ""));
  let productGeneralData = Object.entries(productData).find(([_key, value]) => value?.category);
  productGeneralData = (productGeneralData || ["", {}])[1];
  const variants = [];
  let itemBrand = "";
  for (const key in productData) {
    if (key.includes("Brand:")) {
      itemBrand = productData[key].name;
    }
    if (productData.hasOwnProperty(key) && /^CatalogVariant:\d+$/.test(key)) {
      variants.push(parseInt(key.replace("CatalogVariant:", ""), 10));
    }
  }
  const category = ["category", "subCategory", "type"]
    .filter(key => productGeneralData[key])
    .map(key => productGeneralData[key].join("/"))
    .join("/");

  const rootUrl = getRootUrl(country);

  return variants
    .map(variant => {
      const variantGeneralData = productData[`CatalogVariant:${variant}`];
      if (variantGeneralData.availability.state !== "CanBeBought") return;
      const productName = `${itemBrand} ${variantGeneralData.name ? variantGeneralData.name : ""} ${
        variantGeneralData.variantName ? variantGeneralData.variantName : ""
      } ${variantGeneralData.additionalInfo ? variantGeneralData.additionalInfo : ""}`;
      const product = {
        itemId: `${variantGeneralData.webId}`,
        itemUrl: `${rootUrl}${variantGeneralData.url}`,
        itemName: productName.trim(),
        discounted: false,
        currentPrice: null,
        originalPrice: null,
        currency: null,
        img: null
      };
      product.img = document.querySelector("#pd-image-main")?.getAttribute("src");
      product.category = category;

      const { currentPrice, originalPrice } = determineCurrentAndOriginalPrice(variantGeneralData);

      product.discounted = originalPrice !== null ? currentPrice < originalPrice : false;
      product.currentPrice = Math.round(currentPrice);
      product.originalPrice = originalPrice != null ? Math.round(originalPrice) : null;
      product.currency = variantGeneralData.price && variantGeneralData.price.currency;
      product.inStock = true;
      return product;
    })
    .filter(Boolean);
}

/**
 * @param {Document} document
 * @param {import("@crawlee/http").Request} request
 */
function handleProductUsingHTML(document, request) {
  log.debug("Handled by HTML");
  return document.querySelector("#variants li").map(variant => {
    const product = {
      itemId: `${variant.querySelector('input[name="nComID"]').getAttribute("value")}`,
      itemUrl: `${request.url}`,
      itemName: `${variant.querySelector('input[name="NameItem"]').getAttribute("value")}`,
      discounted: false,
      currentPrice: 0,
      originalPrice: null
    };

    product.img = document.querySelector("#pd-image-main")?.getAttribute("src");
    const currentPrice = parseInt(variant.querySelector('input[name="price"]').getAttribute("value"), 10);
    const originalPriceEl = variant.querySelector(".price span span strong");
    const originalPrice = originalPriceEl ? parseInt(originalPriceEl.innerText, 10) : null;
    product.discounted = originalPrice !== null ? currentPrice < originalPrice : false;
    product.currentPrice = currentPrice ?? null;
    product.originalPrice = product.discounted ? originalPrice : null;
    product.inStock = true;
    return product;
  });
}

async function main() {
  log.info("ACTOR - start");

  const processedIds = await useState("processedIds", {});
  // Dedupe product URLs across the overlapping category + *_images_* sitemaps before enqueuing.
  const seenProductUrls = await useState("seenProductUrls", {});

  rollbar.init();

  const {
    debug,
    development,
    proxyGroups,
    maxRequestRetries,
    country = Country.CZ,
    type = ActorType.Full,
    testUrls
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const stats = await withPersistedStats({
    categories: 0,
    categoriesDone: 0,
    items: 0,
    pages: 0,
    itemsDuplicity: 0,
    crawledProducts: 0,
    JSON: 0,
    HTML: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 600,
    maxRequestRetries,
    requestHandlerTimeoutSecs: 120,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 600
    },
    ignoreSslErrors: true,
    async requestHandler({ request, body, crawler, addRequests }) {
      const label = request.userData.label;
      log.info(`Processing ${request.url}, ${label}`);
      const html = body.toString();
      // Sitemaps are up to ~10 MB of XML - running linkedom over them blows the requestHandler
      // timeout and pegs CPU. Extract <loc> with a cheap regex instead. `<loc>` never matches the
      // namespaced `<image:loc>` nodes, so product image URLs are naturally skipped.
      const sitemapLocs = () => [...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
      switch (label) {
        case Labels.SITEMAP_INDEX: {
          // Fan out from the sitemap index to the product-detail sub-sitemaps (skip reviews).
          const sitemaps = sitemapLocs().filter(isProductDetailSitemap);
          const requests = sitemaps.map(url => ({ url, userData: { label: Labels.PRODUCT_SITEMAP } }));
          stats.add("categories", requests.length);
          await addRequests(requests);
          log.info(`Queued ${requests.length} product sitemaps`);
          break;
        }
        case Labels.PRODUCT_SITEMAP: {
          // Each product `<loc>` is a detail URL. Category and *_images_* sitemaps overlap heavily
          // (~63.6K unique of ~184K listings), so dedupe across sitemaps in-memory before enqueuing
          // to avoid ~3x request-queue churn.
          const requests = [];
          for (const url of sitemapLocs()) {
            if (!url.startsWith(getRootUrl(country)) || seenProductUrls[url]) continue;
            seenProductUrls[url] = true;
            requests.push({ url, userData: { label: Labels.DETAIL_PAGE } });
          }
          stats.add("pages", requests.length);
          // Context addRequests streams large batches in the background, so the handler returns
          // immediately instead of blocking (and timing out) while ~13K URLs are enqueued.
          await addRequests(requests);
          log.debug(`Queued ${requests.length} product details from ${request.url}`);
          break;
        }
        case Labels.BF:
        case Labels.CATEGORY_PAGE:
          {
            const { document } = parseHTML(html);
            const paginationNext = document.querySelector('[rel="next"]')?.getAttribute("href");
            if (paginationNext) {
              await crawler.requestQueue.addRequest(
                {
                  url: paginationNext,
                  userData: {
                    label: Labels.CATEGORY_PAGE
                  }
                },
                { forefront: true }
              );
              log.debug(`Found next pagination page ${paginationNext}`);
              stats.inc("pages");
            }

            const requests = document.querySelectorAll("div[data-product] a").map(a => {
              const url = new URL(request.url);
              return {
                url: `${url.origin}${a.href}`,
                userData: { label: Labels.DETAIL_PAGE }
              };
            });
            await crawler.requestQueue.addRequests(requests);
            log.debug(`Queued ${requests.length}x products detail`);
            stats.add("pages", requests.length);
          }
          break;
        case Labels.DETAIL_PAGE: {
          {
            const { document } = parseHTML(html);
            if (document.querySelector("div#pdVariantsTile")) {
              const productVariants = document.querySelectorAll("div#pdVariantsTile li a").map(a => {
                const url = new URL(request.url);
                return {
                  url: `${url.origin}${a.href}`,
                  userData: { label: Labels.DETAIL_PAGE }
                };
              });
              await crawler.requestQueue.addRequests(productVariants);
              log.debug(`Queued ${productVariants.length}x products detail variants`);
              stats.add("pages", productVariants.length);
            }

            // Getting the data from apollo state is currently the only working way
            let products = [];
            if (document.querySelector("#__APOLLO_STATE__")?.innerHTML) {
              products = handleProductUsingWindowObject(document, country);
              stats.add("JSON", products.length);
            } else if (document.querySelector('a[href="#variants"]')) {
              products = handleProductUsingHTML(document, request);
              stats.add("HTML", products.length);
            } else {
              log.error("Unknown product detail page");
            }
            stats.add("crawledProducts", products.length);
            await saveUniqProducts({ products, stats, processedIds });
          }
          break;
        }
        case Labels.COUNT: {
          log.info("Downloading sitemap root");
          const requests = sitemapLocs()
            .filter(url => url.includes("detail"))
            .map(url => ({ url, userData: { label: Labels.COUNT_PRODUCT } }));
          await crawler.requestQueue.addRequests(requests);
          break;
        }
        case Labels.COUNT_PRODUCT: {
          const urls = sitemapLocs();
          const uniqueUrls = new Set(urls);
          stats.add("items", uniqueUrls.size);
          stats.add("itemsDuplicity", urls.length - uniqueUrls.size);
          break;
        }
      }
    },
    // Notino soft-blocks flagged IPs with 403. Retire the session so the retry uses a fresh IP
    // instead of hammering a burnt one.
    async errorHandler({ session, response }) {
      if (response?.statusCode === 403) session?.retire();
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  log.info("Crawling start");
  const startingRequests = [];
  switch (type) {
    case ActorType.BlackFriday:
      startingRequests.push({
        url: country === Country.CZ ? BASE_URL_CZ_BF : BASE_URL_SK_BF,
        userData: {
          label: Labels.BF
        }
      });
      break;
    case ActorType.Count:
      startingRequests.push({
        url: getSitemapUrl(country),
        userData: { label: Labels.COUNT }
      });
      break;
    case ActorType.Test:
      startingRequests.push({
        url: "https://www.notino.cz/kosmetika/pletova-kosmetika/pletove-kremy/",
        userData: { label: Labels.CATEGORY_PAGE }
      });
      break;
    default:
      // Full: discover the whole catalog via the sitemap (see header comment).
      startingRequests.push({
        url: getSitemapUrl(country),
        userData: { label: Labels.SITEMAP_INDEX }
      });
  }
  await crawler.run(testUrls ?? startingRequests);

  log.info("Crawling finished.");

  const tableName = `notino${
    country === Country.CZ ? "" : `_${country.toLowerCase()}`
  }${type === ActorType.BlackFriday ? "_bf" : ""}`;

  await stats.save(true);

  if (!development && type !== ActorType.Count) {
    await uploadToKeboola(tableName);
  }

  log.info("Finished.");
}

await Actor.main(main);
