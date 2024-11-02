import { HttpCrawler } from '@crawlee/http';
import { launchPlaywright } from '@crawlee/playwright';
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";
import fs from 'node:fs';

/** @typedef {import("@crawlee/http").RequestOptions} RequestOptions */
/** @typedef {import("@hlidac-shopu/actors-common/stats.js").Stats} Stats */

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

/** @enum {string} */
const Currency = {
  CZ: "CZK",
  SK: "EUR"
};

/** @enum {string} */
const Labels = {
  MainSitemap: "MainSitemap",
  ProductsSitemap: "ProductsSitemap",
  Detail: "Detail"
};

// Copy of script accessible from https://www.okay.cz/cdn/shop/t/366/assets/product-price-by-tags.js?v=18180124900739432381729674289
const PRODUCT_PRICE_BY_TAGS_SCRIPT = fs.readFileSync('./external-scripts/product-price-by-tags.js', 'utf8');

/**
 * @param {Country} country
 */
function getBaseUrl(country) {
  switch (country) {
    case Country.CZ:
      return "https://www.okay.cz";
    case Country.SK:
      return "https://www.okay.sk";
    default:
      throw new Error(`Unknown country ${country}`);
  }
}


/**
 * 
 * @param {string} country 
 * @param {string | undefined} proxyUrl 
 * @returns {Promise<object>}
 */
const getShopifyObject = async (country, proxyUrl) => {
  log.info(`Getting Shopify object for country ${country}`);

  const browser = await launchPlaywright({ proxyUrl });
  const page = await browser.newPage();
  await page.goto(getBaseUrl(country));
  await page.waitForLoadState('domcontentloaded');

  const Shopify = await page.evaluate(() => {
    return ['theme_settings', 'translation', 'locale'].reduce((acc, field) => ({
        ...acc,
        [field]: window.Shopify[field],
    }), {});
  });
  Shopify.formatMoney = (x) => x / 100;

  return Shopify;
}

/**
 * @param {string} body 
 */
function productSitemapUrls(body) {
  const { document } = parseXML(body);
  return document
    .getElementsByTagNameNS("", "sitemap")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => url.includes("sitemap_products_"));
}

/**
 * @param {string} body
 */
function listProductUrlsFromSitemap(body) {
  const { document } = parseXML(body);
  return document
    .getElementsByTagNameNS("", "url")
    .flatMap(x => x.getElementsByTagNameNS("", "loc"))
    .map(x => x.textContent.trim())
    .filter(url => url.includes("/products/"));
}

/**
 * @param {string} country 
 */
function sitemapRequest(country) {
  return [
    {
      url: `${getBaseUrl(country)}/sitemap.xml`,
      userData: { label: Labels.MainSitemap }
    }
  ];
}

/**
 * @param {Country|string} country
 * @param {ActorType|string} type
 * @param {RequestOptions[]} urls
 * @return {RequestOptions[]}
 */
function startRequests(country, type, urls) {
  if (urls?.length) return urls;
  if (type === ActorType.BlackFriday) {
    throw new Error('Blackfriday type not implemented');
  }
  return sitemapRequest(country);
}

function parseBreadcrumbs(document) {
  const ld = document.querySelectorAll("script[type='application/ld+json']");
  const bl = Array.from(ld, x => {
    try {
      return JSON.parse(x.innerHTML);
    } catch (err) { }
  }).filter(x => x?.["@type"] === "BreadcrumbList")?.[0];
  return bl.itemListElement
    .slice(1, -1) // First is shop name, last is product name, so skip them
    .map(x => x.item.name)
    .join(" > ");
}

/**
 * @param {object} params
 * @param {string} params.itemId
 * @param {Currency} params.currency
 * @param {HTMLDocument} params.document
 * @param {string} params.url
 * @param {Stats} params.stats
 */
function extractProductDetail({ itemId, document, url, stats, currency }) {
  if (!itemId) return stats.inc("failed");
  stats.inc("items");
  const img = document.querySelector("meta[property='og:image']")?.getAttribute("content");
  const itemName = document.querySelector("meta[property='og:title']")?.getAttribute("content");
  const product = document.querySelector(".product__information");
  const category = parseBreadcrumbs(document);

  // Doporučená cena výrobce
  const recommendedPrice = cleanPrice(product.querySelector(".was-price .money")?.textContent);
  // Nejnižší cena za posledních 30 dní
  const lowestPriceLast30Days = cleanPrice(product.querySelector(".compare_price .money")?.textContent);
  // Běžná prodejní cena
  const commonPrice = cleanPrice(product.querySelector(".current_price.tags-sale .money")?.textContent);

  // Only one of the fields is actually present at a time.
  const originalPrice = lowestPriceLast30Days ?? recommendedPrice ?? commonPrice;

  // Current price is called "Cena s DPH"
  const currentPrice = cleanPrice(product.querySelector(".current-price-incl-vat .money")?.textContent);

  return {
    itemId,
    itemUrl: url,
    img,
    itemName,
    originalPrice,
    currentPrice,
    discounted: Boolean(originalPrice),
    currency,
    category,
    inStock: Boolean(product.querySelector(".in_stock"))
  };
}

const fetchMfData = async (productUrl, {sendRequest}) => {
  const additionalDataUrl = new URL(productUrl);
  additionalDataUrl.searchParams.set('view', 'mf-and-data-for-collections');
  const { body } = await sendRequest({ url: additionalDataUrl.toString() });
  return JSON.parse(body.toString());
}

async function main() {
  const rollbar = Rollbar.init();

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const {
    development,
    debug,
    proxyGroups,
    maxRequestRetries,
    country = Country.CZ,
    customTableName = null,
    type = ActorType.Full,
    forceApifyProxy = false,
    urls
  } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const rootUrl = getBaseUrl(country);
  const currency = Currency[country];

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: forceApifyProxy || !development
  });

  // Before we start crawling, get the Shopify config for the specific country
  const Shopify = await getShopifyObject(country, await proxyConfiguration?.newUrl());

  const crawler = new HttpCrawler({
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    async requestHandler({ request, enqueueLinks, sendRequest, log, body, ...rest }) {
      log.info(`Processing ${request.url}`);
      stats.inc("urls");
      const { label } = request.userData;

      switch (label) {
        case Labels.MainSitemap:
          {
            const urls = productSitemapUrls(body.toString());
            log.info(`Found ${urls.length} product sitemaps`);
            await enqueueLinks({
              urls,
              userData: { label: Labels.ProductsSitemap }
            });
          }
          break;
        case Labels.ProductsSitemap:
          {
            const urls = listProductUrlsFromSitemap(body.toString());
            log.info(`Found ${urls.length} product urls`);
            await enqueueLinks({
              urls,
              userData: { label: Labels.Detail }
            });
          }
          break;
        case Labels.Detail:
          {
            // Call an endpoint that contains additional data we need to be able to calculate the prices
            const mfData = await fetchMfData(request.url, { sendRequest });


            const { document } = parseHTML(body.toString());

            // The modifications of dom rely on subset of jquery, we'll just mock it a bit
            const mockJquery = (selector) => {
              // Getting the product data is handled in a special way
              if (selector === '.product_form') {
                const element = document.querySelector(selector);
                return element ? {
                  data: () => JSON.parse(element.getAttribute('data-product') || 'null'),
                  length: 1,
                  } : { length: 0};
              }

              // Otherwise mock small subset of jquery
              return {
                before: () => {
                    // No need to implement this one - this modification doesn't affect our data
                    // Also, the selector is jquery specific, so we can't just pass it to querySelector
                },
                find: (sel) => mockJquery(`${selector} ${sel}`),
                after: (html) => {
                  const element = document.querySelector(selector);
                  if (!element) return;
                  const template = document.createElement('template');
                  template.innerHTML = html;
                  element.parentNode.insertBefore(template.content.firstChild, element.nextSibling);
                },
                addClass: (cls) => {
                  const element = document.querySelector(selector);
                  if (!element) return;
                  element.classList.add(cls);
                },
                html: (html) => {
                  const element = document.querySelector(selector);
                  if (!element) return;
                  element.innerHTML = `${html}`;
                }
              }
            }

            const context = {
              pricesHistory: mfData.mf_price_history,
              Shopify,
              // Not relevant
              Currency: { money_format: '' },
              localStorage: {},
              storage: {},
              ProductCard: { isDisabledTagAction: () => false },
              FILTER_PRODUCTS_BY_STORE: false,
              $: mockJquery,
              window: document.defaultView,
              document,
            }

            // This function puts it all together. After we run it with our document and window,
            // we'll get item id and document will be modified and contain current prices.
            // In general, eval is unsafe, but in this case we're evaluating a script that we know.
            const adjustPrices = eval(`({${Object.keys(context).join(', ')}}) => { 
              ${PRODUCT_PRICE_BY_TAGS_SCRIPT}

              const updatedProductData = calculateTagSalePrice();

              if (updatedProductData) {
                  ProductPriceByTags.handleFrontendDiscountsDueToLaws({
                      updatedProductData,
                      minimalPercentageDiscount: 5,
                      pricesHistory: pricesHistory,
                      filterProductsByStore: false,
                      lowestPriceIn30Text: "Nejnižší cena za posledních 30 dní",
                      percentageDiscountText: "Sleva"
                  });
              }
            }`);

            // Call the generated script, modify dom and get the item id
            adjustPrices(context);

            // And then scrape the data from product detail, almost as if it was displayed in browser
            const product = extractProductDetail({
              itemId: `${mfData.id}`,
              document,
              url: request.url,
              currency,
              stats
            });
            if (product) {
              await Dataset.pushData(product);
            }
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, request);
      rollbar.error(error, request);
      stats.inc("failed");
    }
  });

  await crawler.run(startRequests(country, type, urls));
  await stats.save(true);

  if (!development) {
    const tableName = customTableName ?? `${shopName(rootUrl)}-daily-v2`;
    await uploadToKeboola(tableName);
  }
}

await Actor.init();

await Actor.main(main, { statusMessage: "DONE" });
