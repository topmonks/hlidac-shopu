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
  SubCat: "SUBCAT",
  Detail: "DETAIL"
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

/**
 * The sitemap lists every level of the category tree, and a parent listing
 * repeats the products of its children ("Obklady a dlažby" shows 827
 * products, exactly the sum of its eight sub-categories). Products are
 * deduplicated by id across listings, so when parents and leaves were crawled
 * together a product's category depended on which listing happened to be
 * processed first, and products went missing from their leaf category. The
 * leaves are crawled first and the parents only after them, because a parent
 * can also hold products none of its children list ("Květináče" has 140 such
 * planters), which the parent walk then picks up under its own breadcrumb.
 *
 * The URL encodes the tree as `/<parent-slug>/<own-slug>/c/<id>`, so a category
 * is a parent when its own slug is the parent slug of another category.
 */
function categoryRequests({ body, homePageUrl }) {
  const { document } = parseXML(body.toString());
  const urls = document
    .querySelectorAll("url loc")
    .map(loc => loc.textContent.trim())
    .filter(url => url.includes("/c/"));
  const parentSlugs = new Set(
    urls
      .map(categorySlugs)
      .map(slugs => slugs.at(-2))
      .filter(Boolean)
  );
  const requests = url =>
    LISTING_PASSES.map(pass => listingRequest({ url: new URL(url, homePageUrl).href, label: Labels.SubCat, pass }));
  const isParent = url => parentSlugs.has(categorySlugs(url).at(-1));
  return {
    leaves: urls.filter(url => !isParent(url)).flatMap(requests),
    parents: urls.filter(isParent).flatMap(requests)
  };
}

/**
 * The shop answers the same listing URL from backends whose indexes
 * disagree: the one category came back with 1364 products on one request
 * and 590 on the next, each with its own order and page count, so a single
 * walk over the pages misses about one product in a hundred. Every listing
 * is walked twice, on separate requests, and the walks are deduplicated by
 * product id.
 */
const LISTING_PASSES = [1, 2];

function listingRequest({ url, label, pass }) {
  return {
    url,
    uniqueKey: pass === 1 ? url : `${url}#pass${pass}`,
    userData: { label, pass }
  };
}

function categorySlugs(url) {
  return new URL(url).pathname.split("/c/")[0].split("/").filter(Boolean);
}

function categoryId(url) {
  return new URL(url).pathname.match(/\/c\/(\d+)/)?.[1];
}

function pagesRequests({ document, productCount, url, pass }) {
  const productPerPageCount = document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name")).length;
  if (!productPerPageCount) return [];
  const pageCount = Math.ceil(productCount / productPerPageCount);
  return pageCount > 1
    ? Array(pageCount - 1)
        .fill(0)
        .map((_, i) => i + 2)
        .map(i => {
          const pageUrl = new URL(url);
          pageUrl.searchParams.set("page", i);
          return listingRequest({ url: pageUrl.href, label: Labels.List, pass });
        })
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
function extractProducts({ document, url, country, processedIds, walkedFamilies }) {
  const category = listingCategory(document);
  const currency = country === "sk" ? "EUR" : "CZK";
  const products = [];
  const families = [];
  for (const tile of document.querySelectorAll("li.product")) {
    const link = tile.querySelector('a[href*="/p/"]');
    const href = link?.getAttribute("href");
    if (!href) continue;
    const itemId = href.match(/\/p\/(\d+)/)?.[1];
    if (!itemId) continue;

    // A listing shows one tile per family of size and colour variants and
    // flags it; the other members are only linked from the detail page.
    if (tile.querySelector(".product__more-variants") && !walkedFamilies.has(itemId)) {
      walkedFamilies.add(itemId);
      families.push(new URL(href, url).href);
    }
    if (processedIds.has(itemId)) continue;

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
      // Tiles below the fold are lazy loaded: `src` is a placeholder gif and
      // the picture sits in `data-src`.
      img:
        tile.querySelector("img.image")?.getAttribute("data-src") ??
        tile.querySelector("img.image")?.getAttribute("src") ??
        null,
      currency,
      currentPrice,
      originalPrice,
      discounted: Boolean(originalPrice && originalPrice > currentPrice),
      // Availability is not exposed on the listing, and was hardcoded before.
      inStock: true,
      category
    });
  }
  return { products, families };
}

/**
 * Size and colour variants of a product are separate products with their own
 * id, page and price, linked from the detail page of every member of the
 * family. Disabled entries are combinations the shop does not sell.
 *
 * @param {{ document: Document, url: string }} options
 */
function variantUrls({ document, url }) {
  return [
    ...new Set(
      document
        .querySelectorAll(
          `.selectboxes .selectbox li:not([class*="disabled"]) a[wt_name*="size_variant"],
           .selectboxes .selectbox li[data-ui-name="ads.variants.color.enabled"] a[wt_name*="color_variant"]`
        )
        .map(a => a.getAttribute("href"))
        .filter(href => href?.includes("/p/"))
        .map(href => new URL(href, url).href)
    )
  ];
}

/**
 * The detail page carries the price in the sticky header on every product
 * type. Products sold by area render it through a price calculator instead
 * of the usual `ads.price.strong` block, which is why the old detail crawl
 * dropped them, but the sticky header still holds the unit price.
 *
 * @param {{ document: Document, url: string, country: string }} options
 */
function extractDetail({ document, url, country }) {
  const itemId =
    document.querySelector('input[name="code"]')?.getAttribute("value")?.trim() ?? url.match(/\/p\/(\d+)/)?.[1];
  const priceBlock = document.querySelector(".overview-sticky-header__price");
  const priceText = priceBlock?.querySelector(".price-switch-label__hd")?.textContent ?? priceBlock?.textContent;
  const currentPrice = cleanPrice(priceText);
  if (!itemId || !currentPrice) return;
  const beforeDiscount = document.querySelector(".optional-hidden del")?.textContent;
  const originalPrice = beforeDiscount ? cleanPrice(beforeDiscount) : null;
  const img = document.querySelector(".ads-slider__link img");
  const imgSrc = img?.getAttribute("data-src") ?? img?.getAttribute("src") ?? null;
  return {
    itemId,
    itemUrl: url,
    itemName: document.querySelector("h1.overview__heading")?.textContent?.trim() ?? "",
    img: imgSrc ? new URL(imgSrc, url).href : null,
    currency:
      document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute("content") ??
      (country === "sk" ? "EUR" : "CZK"),
    currentPrice,
    originalPrice,
    discounted: Boolean(originalPrice && originalPrice > currentPrice),
    inStock: true,
    category: document
      .querySelectorAll('a[class*="normal"][wt_name*="breadcrumb.level"]')
      .map(a => a.textContent.trim())
      .filter(Boolean)
      .join("/")
  };
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

/**
 * The site now and then answers a listing request with a page that has no
 * product grid at all, although the same URL lists products when fetched again.
 * Throwing lets the crawler retry on a fresh session instead of silently
 * losing the category or page.
 */
function parseListing({ body, url, session }) {
  const { document } = parseHTML(body.toString());
  const grid = document.querySelector(".variants");
  if (!grid) {
    session?.retire();
    const title = document.querySelector("title")?.textContent?.trim() ?? "";
    throw new Error(`Listing without product grid: ${url} (${body.length} bytes, title "${title}")`);
  }
  const productCount = parseInt(grid.getAttribute("data-productcount")?.replace(/\s+/g, ""), 10);
  return { document, productCount };
}

async function main() {
  log.info("Actor starts.");

  rollbar.init();

  const processedIds = new Set();
  const crawledCategories = new Set();
  const walkedFamilies = new Set();
  const queuedDetails = new Set();
  const stats = await withPersistedStats({
    urls: 0,
    items: 0,
    totalItems: 0,
    emptyCategories: 0,
    redirectedCategories: 0,
    families: 0,
    variants: 0,
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

  async function pushListing({ document, url }) {
    const { products, families } = extractProducts({ document, url, country, processedIds, walkedFamilies });
    stats.add("totalItems", products.length);
    for (const product of products) {
      stats.inc("items");
      await Dataset.pushData(product);
    }
    // Families are walked after the listings so that every product keeps
    // the category of the listing that shows it.
    stats.add("urls", families.length);
    stats.add("families", families.length);
    await crawler.requestQueue.addRequests(
      families.map(familyUrl => ({ url: familyUrl, userData: { label: Labels.Detail } }))
    );
  }

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
      const { request, body, crawler, session } = context;
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
            const { leaves, parents } = categoryRequests({ body, homePageUrl });
            log.info(`Found ${leaves.length} leaf and ${parents.length} parent category requests`);
            for (const { url } of [...leaves, ...parents]) crawledCategories.add(categoryId(url));
            stats.add("urls", leaves.length + parents.length);
            await crawler.requestQueue.addRequests(leaves, {
              forefront: true
            });
            await crawler.requestQueue.addRequests(parents);
          }
          break;
        case Labels.SubCat:
          {
            const loadedUrl = request.loadedUrl ?? url;
            const loadedId = categoryId(loadedUrl);
            if (loadedId !== categoryId(url)) {
              // A quarter of the sitemap's categories no longer exist and
              // redirect to their parent. Processing the parent's listing
              // under the dead URL would repeat every product of its live
              // children, so the parent is crawled once, and only after the
              // children, which keeps a product in the category that lists it
              // and still picks up products no live child shows.
              stats.inc("redirectedCategories");
              if (crawledCategories.has(loadedId)) return;
              crawledCategories.add(loadedId);
              await crawler.requestQueue.addRequests(
                LISTING_PASSES.map(pass => listingRequest({ url: loadedUrl, label: Labels.SubCat, pass }))
              );
              return;
            }

            const { document, productCount } = parseListing({ body, url, session });

            // The sitemap already names every leaf category, so an empty
            // listing is left alone. Following its navigation links led back
            // to the parent listing and reintroduced the duplicates.
            if (!productCount) {
              log.warning(`No products on ${url}`);
              stats.inc("emptyCategories");
              return;
            }

            const pageRequests = pagesRequests({ document, productCount, url: loadedUrl, pass: request.userData.pass });
            await crawler.requestQueue.addRequests(pageRequests, {
              forefront: true
            });
            stats.add("urls", pageRequests.length);

            await pushListing({ document, url });
          }
          break;
        case Labels.List:
          {
            const { document } = parseListing({ body, url, session });
            await pushListing({ document, url });
          }
          break;
        case Labels.Detail:
          {
            const { document } = parseHTML(body.toString());
            if (!document.querySelector("h1.overview__heading")) {
              session?.retire();
              throw new Error(`Detail page without product: ${url} (${body.length} bytes)`);
            }
            const urls = variantUrls({ document, url }).filter(variantUrl => {
              const id = variantUrl.match(/\/p\/(\d+)/)?.[1];
              if (!id || processedIds.has(id) || queuedDetails.has(id)) return false;
              queuedDetails.add(id);
              return true;
            });
            stats.add("urls", urls.length);
            stats.add("variants", urls.length);
            await crawler.requestQueue.addRequests(
              urls.map(variantUrl => ({ url: variantUrl, userData: { label: Labels.Detail } }))
            );

            const product = extractDetail({ document, url, country });
            if (product && !processedIds.has(product.itemId)) {
              processedIds.add(product.itemId);
              stats.inc("totalItems");
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
