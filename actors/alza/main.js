import { PlaywrightCrawler } from "@crawlee/playwright";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { parseStructuredData } from "@topmonks/eu-shop-monitoring-lib/structured-data-extractor.mjs";
import { Actor, Dataset, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Label = {
  Category: "CATEGORY",
  Detail: "DETAIL",
  Pagination: "PAGINATION"
};

const extractItem = item => (Array.isArray(item) ? item[0] : item);

function getOffer(jsonld, microdata) {
  const product = extractItem(jsonld.get("Product"));
  const offers = product?.offers ?? microdata.get("offers");
  if (!offers) return new Map();

  const firstOffer = extractItem(offers);
  if (firstOffer instanceof Map) return firstOffer;
  return new Map(Object.entries(firstOffer));
}

/**
 * Extracts prices from structured data
 * @param {Map<string, any>} structuredData
 * @returns {object}
 */
function extractStructuredData(structuredData) {
  const metaTags = structuredData.get("metatags");
  const jsonLd = structuredData.get("jsonld");
  const microdata = structuredData.get("microdata");
  const offer = getOffer(jsonLd, microdata);

  const currentPrice =
    extractItem(metaTags.get("product:price:amount")) ??
    extractItem(offer.get("lowPrice")) ??
    extractItem(offer.get("price"));
  const currency = extractItem(metaTags.get("product:price:currency")) ?? extractItem(offer.get("priceCurrency"));
  const referralPrice =
    extractItem(offer.get("lowPrice")) != extractItem(offer.get("highPrice"))
      ? extractItem(offer.get("highPrice"))
      : null;

  return {
    itemName: extractItem(metaTags.get("twitter:title")),
    itemUrl: extractItem(metaTags.get("og:url")),
    img: extractItem(metaTags.get("twitter:image")),
    category: extractItem(jsonLd.get("BreadcrumbList"))
      .itemListElement.map(x => x.item.name)
      .join(" > "),
    itemCode: extractItem(jsonLd.get("Product"))?.sku,
    rating: extractItem(jsonLd.get("Product"))?.aggregateRating?.ratingValue,
    inStock: offer.get("availability") === "http://schema.org/InStock",
    discontinued: offer.get("availability") === "http://schema.org/Discontinued",
    currentPrice: cleanPrice(currentPrice != null ? String(currentPrice) : null),
    originalPrice: cleanPrice(referralPrice != null ? String(referralPrice) : null),
    currency
  };
}

/**
 * @param {string} encodedString
 * @return {string}
 */
function decodeEntities(encodedString) {
  const translate_re = /&(nbsp|amp|quot|lt|gt);/g;
  const translate = new Map([
    ["nbsp", " "],
    ["amp", "&"],
    ["quot", '"'],
    ["lt", "<"],
    ["gt", ">"]
  ]);
  return encodedString
    .replace(translate_re, (match, entity) => translate.get(entity))
    .replace(/&#(\d+);/gi, (match, numStr) => String.fromCharCode(parseInt(numStr, 10)));
}

/**
 * @param {Document} document
 */
function extractDOM(document) {
  const detailPage = document.querySelector(".detail-page");
  if (!detailPage) return;
  return {
    itemId: detailPage.dataset.id,
    originalPrice: cleanPrice(document.querySelector("#detailText .price-box__compare-price")?.textContent)
  };
}

/**
 * @param {Document} document
 * @param {Map} structuredData
 */
function extractDetail(document, structuredData) {
  const domParts = extractDOM(document);
  if (!domParts) return;

  const structuredParts = extractStructuredData(structuredData);
  return Object.assign(
    {
      get discounted() {
        return this.originalPrice ? this.currentPrice < this.originalPrice : false;
      }
    },
    structuredParts,
    domParts,
    { category: decodeEntities(structuredParts.category) }
  );
}

/**
 * @param {Document} document
 * @return {{pages: number, categoryId: number} | undefined}
 */
function extractPaginationInfo(document) {
  const surveyInfoForm = document.querySelector(".surveyInfoForm");
  if (!surveyInfoForm) return;

  const categoryId = cleanPrice(surveyInfoForm?.dataset?.id);
  const itemsCount = cleanPrice(document.getElementById("lblNumberItem")?.textContent);
  const pages = Math.ceil(itemsCount / 24);
  return { categoryId, pages };
}

function createPaginationPayload({ categoryId, page }) {
  return {
    "idCategory": categoryId,
    "producers": "",
    "parameters": [],
    "idPrefix": 0,
    "prefixType": 3,
    page,
    // "pageTo": page,
    "availabilityType": 0,
    "newsOnly": false,
    "commodityStatusType": 1,
    "upperDescriptionStatus": 0,
    "branchId": -2,
    "sort": 0,
    "categoryType": 29,
    "searchTerm": "",
    "sendProducers": false,
    "layout": 1,
    "append": false,
    "yearFrom": null,
    "yearTo": null,
    "artistId": null,
    "minPrice": -1,
    "maxPrice": -1,
    "showOnlyActionCommodities": false,
    "callFromParametrizationDialog": false,
    "commodityWearType": null,
    "configurationId": 3,
    "sectionId": 1,
    "hash": `#f&cst=1&cud=0&pg=${page}&prod=`,
    "counter": page + 1
  };
}

async function handleDetail(body, stats) {
  const html = body.toString();
  const { document } = parseHTML(html);
  const structuredData = parseStructuredData(document);
  const detail = extractDetail(document, structuredData);
  if (detail) {
    await Dataset.pushData(detail);
    stats.inc("details");
  } else {
    stats.inc("zeroItems");
  }
}

async function handlePagination(page, userData, createUrl, requestQueue, stats, log) {
  const { categoryId, pageNum } = userData;

  // Make API call from browser context to avoid Cloudflare detection
  const payload = createPaginationPayload({ categoryId, page: pageNum });
  const response = await page.evaluate(async ([filterUrl, payloadData]) => {
    const res = await fetch(filterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payloadData)
    });
    return await res.json();
  }, [createUrl("/Services/EShopService.svc/Filter"), payload]);

  // Extract product URLs from the response
  if (response && response.d && response.d.Boxes) {
    const { document: pageDoc } = parseHTML(response.d.Boxes);
    const links = Array.from(pageDoc.querySelectorAll(".browsinglink.name"));
    const urls = links.map(x => createUrl(x.href));
    await requestQueue.addRequests(urls.map(url => ({ label: Label.Detail, url })));
    stats.inc("pages");
    log.info(`Processed page ${pageNum + 1}, found ${urls.length} products`);
  }
}

async function handleCategory(body, log, session, stats, createUrl, requestQueue, categoryUrl) {
  const html = body.toString();
  const { document } = parseHTML(html);
  const pagination = extractPaginationInfo(document);
  if (!pagination) {
    log.warning(document.innerHTML);
    if (session) session.isBlocked();
    stats.inc("errors");
    throw new Error("Can't find pagination info");
  }
  const { categoryId, pages } = pagination;
  log.info("Category pagination info", { categoryId, pages });

  // Queue pagination requests (each will be processed independently)
  for (let pageNum = 0; pageNum < pages; pageNum++) {
    await requestQueue.addRequest({
      url: categoryUrl,  // Navigate to category page to establish browser context
      uniqueKey: `pagination-${categoryId}-${pageNum}`,
      userData: {
        label: Label.Pagination,
        categoryId,
        pageNum
      }
    });
  }

  stats.inc("categories");
}

/**
 * @param {ActorType} type
 */
function getPostfix(type) {
  switch (type) {
    case ActorType.BlackFriday:
      return "_bf";
    case ActorType.Feed:
      return "_feed";
    default:
      return "";
  }
}

/**
 * @param {string} country
 * @param {ActorType} type
 */
function getTableName(country, type) {
  const countryCode = country.toLowerCase();
  const postfix = getPostfix(type);
  return `alza_${countryCode}${postfix}`;
}

async function main() {
  const rollbar = Rollbar.init();

  const { development, proxyGroups, country = "CZ", type = ActorType.BlackFriday, urls = [] } = await getInput();

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const stats = await withPersistedStats({
    categories: 0,
    details: 0,
    pages: 0,
    items: 0,
    denied: 0,
    ok: 0,
    zeroItems: 0,
    errors: 0,
    failed: 0
  });

  const crawler = new PlaywrightCrawler({
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      persistStateKeyValueStoreId: "alza-sessions"
    },
    proxyConfiguration,
    maxRequestsPerMinute: 600,
    launchContext: {
      launchOptions: {
        headless: true
      }
    },
    async requestHandler({ request, page, log, crawler }) {
      const { label } = request.userData;

      log.info(`Visiting: ${request.url}, ${label}`);
      stats.inc("ok");

      const createUrl = s => new URL(s, request.url).href;

      switch (label) {
        case Label.Category:
          const html = await page.content();
          return handleCategory(Buffer.from(html), log, null, stats, createUrl, crawler.requestQueue, request.url);
        case Label.Pagination:
          return handlePagination(page, request.userData, createUrl, crawler.requestQueue, stats, log);
        case Label.Detail:
          const detailHtml = await page.content();
          return handleDetail(Buffer.from(detailHtml), stats);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} ${error.message} failed multiple times`);
      rollbar.error(error, request);
      stats.inc("failed");
    }
  });

  if (urls.length === 0) {
    if (type === ActorType.BlackFriday) {
      urls.push(`https://www.alza.${country.toLowerCase()}/black-friday`);
    } else {
      log.info("No URLs provided");
    }
  }
  await crawler.run(urls.map(url => ({ url, userData: { label: Label.Category } })));
  await stats.save(true);

  try {
    const tableName = getTableName(country, type);
    await uploadToKeboola(tableName);
  } catch (err) {
    log.error(err);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
