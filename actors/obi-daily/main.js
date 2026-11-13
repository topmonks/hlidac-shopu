import { URL } from "url";
import { HttpCrawler } from "@crawlee/http";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, LogLevel, log } from "apify";
import { listingProducts, listingResult } from "./listing.js";

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

/**
 * The site now and then answers a listing request with a page that has no
 * products at all, although the same URL lists products when fetched again.
 * Throwing lets the crawler retry on a fresh session instead of silently
 * losing the category or page.
 */
function parseListing({ body, url, session }) {
  const html = body.toString();
  const result = listingResult(html);
  if (!result) {
    session?.retire();
    const title = html.match(/<title[^>]*>([^<]*)/)?.[1].trim() ?? "";
    throw new Error(`Listing without product state: ${url} (${body.length} bytes, title "${title}")`);
  }
  return result;
}

async function main() {
  log.info("Actor starts.");

  rollbar.init();

  const processedIds = new Set();
  const crawledCategories = new Set();
  const stats = await withPersistedStats({
    urls: 0,
    items: 0,
    totalItems: 0,
    emptyCategories: 0,
    redirectedCategories: 0,
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

  async function pushListing({ result, url }) {
    const products = listingProducts({ result, url }).filter(({ itemId }) => {
      if (processedIds.has(itemId)) return false;
      processedIds.add(itemId);
      return true;
    });
    stats.add("totalItems", products.length);
    stats.add("items", products.length);
    await Dataset.pushData(products);
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

            const result = parseListing({ body, url, session });

            // The sitemap already names every leaf category, so an empty
            // listing is left alone. Following its navigation links led back
            // to the parent listing and reintroduced the duplicates.
            if (!result.gesamtanzahlErgebnisse) {
              log.warning(`No products on ${url}`);
              stats.inc("emptyCategories");
              return;
            }

            const pageRequests = restPageUrls(result.seitenAnzahl, page => {
              const pageUrl = new URL(loadedUrl);
              pageUrl.searchParams.set("page", page);
              return listingRequest({ url: pageUrl.href, label: Labels.List, pass: request.userData.pass });
            });
            await crawler.requestQueue.addRequests(pageRequests, {
              forefront: true
            });
            stats.add("urls", pageRequests.length);

            await pushListing({ result, url });
          }
          break;
        case Labels.List:
          await pushListing({ result: parseListing({ body, url, session }), url });
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
  // A listing markup change fails every listing; without this the run still
  // succeeded with an empty dataset (#3682).
  if (!processedIds.size) {
    throw new Error("No products scraped - blocked or site structure changed");
  }

  if (!development) {
    const tableName = `obi${country === "it" ? "-italia" : ""}_${country}`;
    await uploadToKeboola(tableName);
    log.info(`update to Keboola finished ${tableName}.`);
  }
  log.info("Actor Finished.");
}

await Actor.main(main);
