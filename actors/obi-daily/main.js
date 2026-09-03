import { URL } from "url";
import { HttpCrawler } from "@crawlee/http";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, LogLevel, log } from "apify";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Labels = {
  Start: "START",
  SitemapIndex: "SITEMAP_INDEX",
  CategorySitemap: "CATEGORY_SITEMAP",
  List: "LIST",
  SubCat: "SUBCAT"
};

// The header category navigation is rendered client side, so the home page HTML
// contains no category tree. The XML sitemap advertised in robots.txt is the
// only server rendered listing of all categories.
function sitemapIndexRequests({ body, homePageUrl }) {
  return body
    .toString()
    .split(/\r?\n/)
    .map(line => line.match(/^\s*Sitemap:\s*(\S+)/i)?.[1])
    .filter(url => url?.endsWith("sitemap_index.xml"))
    .map(url => ({
      url: new URL(url, homePageUrl).href,
      userData: { label: Labels.SitemapIndex }
    }));
}

function categorySitemapRequests({ body, homePageUrl }) {
  const { document } = parseXML(body.toString());
  return document
    .querySelectorAll("sitemap loc")
    .map(loc => loc.textContent.trim())
    .filter(url => url.includes("obi-category"))
    .map(url => ({
      url: new URL(url, homePageUrl).href,
      userData: { label: Labels.CategorySitemap }
    }));
}

function categoryRequests({ body, homePageUrl }) {
  const { document } = parseXML(body.toString());
  return document
    .querySelectorAll("url loc")
    .map(loc => loc.textContent.trim())
    .filter(url => url.includes("/c/"))
    .map(url => ({
      url: new URL(url, homePageUrl).href,
      userData: { label: Labels.SubCat }
    }));
}

function pagesRequests({ document, url }) {
  const productCount = Number(document.querySelector(".variants")?.getAttribute("data-productcount"));
  const productPerPageCount = document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name")).length;
  const pageCount = Math.ceil(productCount / productPerPageCount);
  return pageCount > 1
    ? Array(pageCount - 1)
        .fill(0)
        .map((_, i) => i + 2)
        .map(i => ({
          url: `${url}/?page=${i}`,
          userData: { label: Labels.List }
        }))
    : [];
}

/**
 * Category listings carry every field the dataset needs, so the per product
 * detail page is not fetched. The price sits in a `data-csscontent` attribute
 * rather than in text, because OBI renders it through CSS. Discounted tiles use
 * a different block (`strike-price-*`) that also carries the price before the
 * cut.
 *
 * @param {{ document: Document, url: string, country: string, processedIds: Set<string> }} options
 */
function extractProducts({ document, url, country, processedIds }) {
  const category = listingCategory(document);
  const currency = country === "sk" ? "EUR" : "CZK";
  const products = [];
  for (const tile of document.querySelectorAll("li.product")) {
    const link = tile.querySelector('a[href*="/p/"]');
    const href = link?.getAttribute("href");
    if (!href) continue;
    const itemId = href.match(/\/p\/(\d+)/)?.[1];
    if (!itemId || processedIds.has(itemId)) continue;

    const discountedPrice = tile.querySelector(".strike-price-current")?.getAttribute("data-csscontent");
    const beforeDiscount = tile.querySelector(".strike-price-old")?.textContent;
    const plainPrice = tile.querySelector(".price-new")?.getAttribute("data-csscontent");

    const currentPrice = cleanPrice(discountedPrice ?? plainPrice);
    if (!currentPrice) continue;
    const originalPrice = beforeDiscount ? cleanPrice(beforeDiscount) : null;

    processedIds.add(itemId);
    products.push({
      itemId,
      itemUrl: new URL(href, url).href,
      itemName: (link.getAttribute("title") ?? "").trim(),
      img: tile.querySelector("img.image")?.getAttribute("src") ?? null,
      currency,
      currentPrice,
      originalPrice,
      discounted: Boolean(originalPrice && originalPrice > currentPrice),
      // Availability is not exposed on the listing, and was hardcoded before.
      inStock: true,
      category
    });
  }
  return products;
}

/**
 * The breadcrumb trail omits the category the page itself is showing, which the
 * `h1` carries, so the two together reproduce the full path.
 *
 * @param {Document} document
 */
function listingCategory(document) {
  const leaf = document.querySelector("h1")?.textContent?.trim();
  return [...document.querySelectorAll('a[class*="normal"][wt_name*="breadcrumb.level"]')]
    .map(a => a.textContent.trim())
    .concat(leaf ? [leaf] : [])
    .filter(Boolean)
    .join("/");
}

async function main() {
  log.info("Actor starts.");

  rollbar.init();

  const processedIds = new Set();
  const stats = await withPersistedStats({
    urls: 0,
    items: 0,
    totalItems: 0,
    failed: 0
  });

  const { development, proxyGroups, maxRequestRetries, country = "cz" } = await getInput();

  if (development) {
    log.setLevel(LogLevel.DEBUG);
  }

  const homePageUrl = `https://www.obi${country === "it" ? "-italia" : ""}.${country}`;

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 1200,
    requestHandlerTimeoutSecs: 45,
    // robots.txt is served as text/plain, which HttpCrawler rejects by default
    additionalMimeTypes: ["text/plain"],
    proxyConfiguration,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      maxPoolSize: 150
    },
    async requestHandler(context) {
      const { request, body, crawler } = context;
      const { url } = request;
      log.info(`Processing ${request.url}`);
      const { label } = request.userData;
      switch (label) {
        case Labels.Start:
          {
            const requests = sitemapIndexRequests({ body, homePageUrl });
            if (!requests.length) {
              throw new Error(`No sitemap index found in ${request.url}`);
            }
            stats.add("urls", requests.length);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        case Labels.SitemapIndex:
          {
            const requests = categorySitemapRequests({ body, homePageUrl });
            if (!requests.length) {
              throw new Error(`No category sitemap found in ${request.url}`);
            }
            stats.add("urls", requests.length);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        case Labels.CategorySitemap:
          {
            const requests = categoryRequests({ body, homePageUrl });
            log.info(`Found ${requests.length} categories`);
            stats.add("urls", requests.length);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        case Labels.SubCat:
          {
            const { document } = parseHTML(body.toString());
            const productCount = parseInt(
              document.querySelector(".variants")?.getAttribute("data-productcount")?.replace(/\s+/g, ""),
              10
            );

            if (productCount) {
              const pageRequests = pagesRequests({ document, url });
              await crawler.requestQueue.addRequests(pageRequests, {
                forefront: true
              });
              stats.add("urls", pageRequests.length);

              const products = extractProducts({ document, url, country, processedIds });
              stats.add("totalItems", products.length);
              for (const product of products) {
                stats.inc("items");
                await Dataset.pushData(product);
              }
              return;
            }

            const subCategoryList = document.querySelectorAll('a[wt_name="assortment_menu.level2"]').map(a => a.href);
            const subCatRequests = subCategoryList.map(subcategoryLink => ({
              url: new URL(subcategoryLink, homePageUrl).href,
              userData: { label: request.userData.label }
            }));

            stats.add("urls", subCatRequests.length);
            await crawler.requestQueue.addRequests(subCatRequests, {
              forefront: true
            });
          }
          break;
        case Labels.List:
          {
            const { document } = parseHTML(body.toString());
            const products = extractProducts({ document, url, country, processedIds });
            stats.add("totalItems", products.length);
            for (const product of products) {
              stats.inc("items");
              await Dataset.pushData(product);
            }
          }
          break;
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  log.info("crawler starts.");
  await crawler.run([
    {
      url: `${homePageUrl}/robots.txt`,
      userData: { label: Labels.Start }
    }
  ]);

  await stats.save();

  if (!development) {
    const tableName = `obi${country === "it" ? "-italia" : ""}_${country}`;
    await uploadToKeboola(tableName);
    log.info(`update to Keboola finished ${tableName}.`);
  }
  log.info("Actor Finished.");
}

await Actor.main(main);
