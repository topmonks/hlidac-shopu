import { gunzipSync } from "node:zlib";
import { BasicCrawler, useState } from "@crawlee/basic";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, log } from "apify";
import { launchContext as launchCloakContext } from "cloakbrowser";
import { Impit } from "impit";

const shopUrl = "https://www.lidl.cz";
const sitemapIndexUrl = "https://www.lidl.cz/static/sitemap.xml";

// ---------------------------------------------------------------------------
// Discovery: enumerate every leaf category deterministically from the sitemap.
// ---------------------------------------------------------------------------
// Category coverage used to be discovered by DOM-scraping the SPA category
// pages, which is non-deterministic (anti-bot + render timing) and missed the
// bulk /h/ hub catalog entirely — so the scraped item count oscillated between
// runs (#3564). The sitemap gives the same complete leaf-category list every
// run. The gzipped sitemap assets are not behind the bot wall, so a plain
// fetch is enough here.
async function sitemapCategoryUrls() {
  const indexXml = await (await fetch(sitemapIndexUrl)).text();
  const pagesUrl = indexXml.match(/<loc>\s*(https:\/\/[^<\s]*pages_[^<\s]*\.xml\.gz)\s*<\/loc>/)?.[1];
  if (!pagesUrl) {
    throw new Error("lidl sitemap: pages sitemap not found in sitemap index - structure changed");
  }

  const raw = Buffer.from(await (await fetch(pagesUrl)).arrayBuffer());
  let xml;
  try {
    xml = gunzipSync(raw).toString("utf-8");
  } catch {
    xml = raw.toString("utf-8");
  }

  // Leaf categories: /h/<slug>/h<NNNN> (hubs, the bulk product catalog) and /c/<slug>/s<NNNN>.
  const urls = [
    ...xml.matchAll(/<loc>\s*(https:\/\/www\.lidl\.cz\/(?:h|c)\/[^<\s]+\/[hs]\d+)\s*<\/loc>/g)
  ].map(m => m[1]);

  // Process the product hubs (/h/) first: most /c/ sitemap entries are content
  // pages (FAQ, cookies, ...) that the product API returns empty for.
  return [...new Set(urls)].sort((a, b) => (a.includes("/h/") ? 0 : 1) - (b.includes("/h/") ? 0 : 1));
}

/**
 * Build the product API URL for a category page URL.
 * Hub categories (/h/) require the type segment in the API path
 * (category/h/<slug>/<id>); content categories (/c/) do not.
 */
function categoryApiUrl(pageUrl, offset, fetchsize) {
  const m = pageUrl.match(/\/(h|c)\/([^/]+)\/([hs]\d+)/);
  if (!m) return null;
  const [, type, slug, id] = m;
  const path = type === "h" ? `h/${slug}` : slug;
  return `${shopUrl}/q/api/category/${path}/${id}?offset=${offset}&fetchsize=${fetchsize}&locale=cs_CZ&assortment=CZ&version=2.1.0`;
}

function toProduct(item, processedIds, stats) {
  const gridData = item.gridbox?.data;
  if (!gridData) return null;

  stats.inc("items");
  if (processedIds[item.code]) {
    stats.inc("itemsDuplicity");
    return null;
  }
  processedIds[item.code] = true;
  stats.inc("itemsUnique");

  return {
    itemId: item.code,
    itemName: gridData.fullTitle,
    itemUrl: `${shopUrl}${gridData.canonicalPath}`,
    img: gridData.image,
    currentPrice: gridData.price?.price,
    originalPrice: gridData.price?.discount?.deletedPrice || gridData.price?.price,
    discounted: gridData.price?.discount?.showDiscount || false,
    inStock: gridData.stockAvailability?.onlineAvailable || false,
    currency: "CZK",
    category: gridData.category ? gridData.category.split("/").slice(1).join(" > ") : "",
    slug: item.code
  };
}

// ---------------------------------------------------------------------------
// Solver: cloakbrowser earns a Lidl/Myra session cookie jar.
// ---------------------------------------------------------------------------
// www.lidl.cz is fronted by Myra Security. The product JSON API
// (/q/api/category/...) is bot-walled: a non-browser HTTP client gets a bare
// 401 even with the right URL. cloakbrowser is a stealth-patched Chromium that
// runs the page's JS challenge and earns the Myra session cookies, which the
// impit executor then replays with a real Chrome TLS handshake.
async function solveMyra() {
  log.info("Solver: launching cloakbrowser to earn a Lidl/Myra session…");
  const ctx = await launchCloakContext({
    headless: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague"
  });
  try {
    const page = await ctx.newPage();
    await page.goto(shopUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    const jar = await ctx.cookies(shopUrl);
    log.info(`Solver: earned ${jar.length} cookies`);
    return Object.fromEntries(jar.map(c => [c.name, c.value]));
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Executor: impit (Chrome TLS fingerprint) + solved cookies → JSON API.
// ---------------------------------------------------------------------------
// Myra checks the TLS fingerprint on every request, not just the cookies, so
// node fetch / got-scraping / curl-OpenSSL get 401 even with a valid session.
// impit impersonates Chrome's TLS handshake from Node so Myra accepts the
// solver's cookies as genuinely browser-issued.
async function apiFetch(impit, cookies, url) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const res = await impit.fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
      Referer: `${shopUrl}/`
    }
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const rollbar = Rollbar.init();

  const { development, maxRequestRetries = 3, type = ActorType.Full, maxCategories } = await getInput();

  const stats = await withPersistedStats({
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0,
    blocked: 0,
    failed: 0
  });
  const processedIds = await useState("processedIds", {});

  // Phase 1 — Solver: earn a Myra session.
  let cookies = await solveMyra();

  // Phase 2 — Executor: impit with a Chrome TLS fingerprint.
  log.info("Executor: initializing impit (chrome TLS)");
  const impit = new Impit({ browser: "chrome", ignoreTlsErrors: true });

  // Myra eventually expires the session; on a 401/non-JSON response we re-solve.
  // A mutex (in-flight promise) keeps the concurrent workers from stampeding
  // cloakbrowser into many parallel re-solves.
  let solvePromise = null;
  async function triggerResolve(reason) {
    if (solvePromise) return solvePromise;
    solvePromise = (async () => {
      try {
        log.warning(`Myra re-solve triggered: ${reason}`);
        cookies = await solveMyra();
      } finally {
        solvePromise = null;
      }
    })();
    return solvePromise;
  }

  // Discover the leaf categories deterministically.
  let categoryUrls = await sitemapCategoryUrls();
  if (maxCategories) categoryUrls = categoryUrls.slice(0, maxCategories);
  log.info(`Discovered ${categoryUrls.length} leaf categories from sitemap`);

  const crawler = new BasicCrawler({
    maxRequestRetries,
    maxRequestsPerMinute: 200,
    maxConcurrency: 20,
    async requestHandler({ request, log }) {
      if (solvePromise) await solvePromise;

      stats.inc("categories");
      const fetchsize = 1000;
      let offset = 0;
      let categoryTotal = null;

      while (true) {
        const apiUrl = categoryApiUrl(request.url, offset, fetchsize);
        if (!apiUrl) {
          log.error(`Could not build API url for ${request.url}`);
          return;
        }

        const { status, body } = await apiFetch(impit, cookies, apiUrl);

        // Bot wall → re-solve and retry this category.
        if (status === 401 || status === 403) {
          stats.inc("blocked");
          await triggerResolve(`block ${status} on ${request.url}`);
          throw new Error("Myra session re-solved, retrying request");
        }

        let data;
        try {
          data = JSON.parse(body);
        } catch {
          stats.inc("blocked");
          await triggerResolve(`non-JSON response on ${request.url} (status=${status}, ${body.length}b)`);
          throw new Error("Myra session re-solved, retrying request");
        }

        if (!data.items || data.items.length === 0) break;

        if (categoryTotal === null) {
          categoryTotal = data.numFound;
          log.info(`category ${request.url}: ${categoryTotal} products`);
        }

        const products = data.items.map(item => toProduct(item, processedIds, stats)).filter(Boolean);
        if (products.length > 0) await Dataset.pushData(products);

        offset += data.items.length;
        if (offset >= data.numFound) break;
      }
    },
    failedRequestHandler({ request }, error) {
      stats.inc("failed");
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run(categoryUrls.map(url => ({ url, userData: { label: "CATEGORY" } })));
  await stats.save(true);

  if (!development && type !== ActorType.Test) {
    const tableName = type === ActorType.BlackFriday ? "lidl_cz_bf" : "lidl_cz";
    await uploadToKeboola(tableName);
  }

  log.info("Finished.");
}

await Actor.main(main);
