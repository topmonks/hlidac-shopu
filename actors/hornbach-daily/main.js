import { BasicCrawler } from "@crawlee/basic";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, Dataset, LogLevel, log } from "apify";
import { launchContext as launchCloakContext } from "cloakbrowser";
import { Impit } from "impit";

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

const Locale = {
  CZ: { locale: "cs-CZ", timezoneId: "Europe/Prague", acceptLanguage: "cs-CZ,cs;q=0.9,en;q=0.8" },
  SK: { locale: "sk-SK", timezoneId: "Europe/Bratislava", acceptLanguage: "sk-SK,sk;q=0.9,en;q=0.8" }
};

/** @enum {string} */
const Labels = {
  TOP_CATEGORIES: "TOP_CATEGORIES",
  SUB_CATEGORIES: "SUB_CATEGORIES",
  CAT_PRODUCTS: "CAT_PRODUCTS"
};

/** @enum {string} */
const Selectors = {
  TOP_CATEGORIES: '[data-testid="product-category"] h2 a',
  SUB_CATEGORIES: '[data-testid="categories-slider"] [data-testid="slider-card"] a',
  CATEGORY_NAME: "p"
};

/**
 * @param {string} country
 * @param {string} path
 */
function completeUrl(country, path) {
  return new URL(path, `https://www.hornbach.${country.toLowerCase()}`).href;
}

// Fastly Bot Management answers non-consumer IPs with a 200 + JS challenge stub
// instead of the page, so the crawl needs a browser-solved cookie and a Chrome
// TLS fingerprint. See README.md ("Fastly bot protection") for the measurements
// behind this design; same solver/executor split as datart-daily and lidl-daily.

function isChallenge(body) {
  return body.includes("Client Challenge") || body.includes("/_fs-ch-");
}

/**
 * Launch cloakbrowser, let it clear the Fastly challenge, return the cookie jar.
 * @param {string} rootUrl
 * @param {{locale: string, timezoneId: string}} locale
 * @returns {Promise<Record<string, string>>}
 */
async function solveChallenge(rootUrl, locale) {
  log.info("Solver: launching cloakbrowser to clear the Fastly client challenge…");
  const ctx = await launchCloakContext({
    headless: true,
    locale: locale.locale,
    timezoneId: locale.timezoneId
  });
  try {
    const page = await ctx.newPage();
    await page.goto(`${rootUrl}/c/`, { waitUntil: "domcontentloaded", timeout: 60000 });

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      try {
        if (!isChallenge(await page.content())) {
          const jar = await ctx.cookies(rootUrl);
          const passCookie = jar.find(c => c.name.startsWith("_fs_ch_cp_"));
          log.info(
            `Solver: challenge cleared (${jar.length} cookies${passCookie ? ", _fs_ch_cp_ present" : ", IP not challenged"})`
          );
          // Resending _fs_ch_st_ (the challenge's own 10 s state cookie) is what
          // keeps a client stuck in the challenge — drop it, keep _fs_ch_cp_ + hb*.
          return Object.fromEntries(jar.filter(c => !c.name.startsWith("_fs_ch_st_")).map(c => [c.name, c.value]));
        }
      } catch {
        // a content read can race the challenge's own navigation — keep polling
      }
      await page.waitForTimeout(1000);
    }
    throw new Error("Solver: timed out waiting for the Fastly challenge to clear");
  } finally {
    await ctx.close();
  }
}

/** A fresh executor client, i.e. an empty cookie jar behind a Chrome TLS fingerprint. */
function newExecutor() {
  return new Impit({ browser: "chrome", ignoreTlsErrors: true });
}

/**
 * @param {Impit} impit
 * @param {Record<string, string>} cookies
 * @param {string} url
 * @param {string} acceptLanguage
 */
async function executorFetch(impit, cookies, url, acceptLanguage) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const res = await impit.fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": acceptLanguage,
      "Upgrade-Insecure-Requests": "1"
    }
  });
  return { status: res.status, body: await res.text() };
}

function topCategoriesRequests({ document, country }) {
  const links = document.querySelectorAll(Selectors.TOP_CATEGORIES);
  return links.map(link => {
    log.debug(`Queued top lvl category "${link.getAttribute("title")}"`);
    const href = link.getAttribute("href");
    return {
      url: completeUrl(country, href),
      userData: {
        label: Labels.SUB_CATEGORIES,
        crumbs: []
      }
    };
  });
}

function subCategoriesRequests({ document, country, request, stats }) {
  const links = document.querySelectorAll(Selectors.SUB_CATEGORIES);
  return links.map(link => {
    const crumb = {
      link: completeUrl(country, link.getAttribute("href")),
      // The name lives in the card this link wraps — reading it off the
      // document would label every category on the page after the first one
      // with the first card's name.
      title: link.querySelector(Selectors.CATEGORY_NAME)?.innerText?.trim()
    };
    stats.inc("categories");
    log.debug(`Scraped category "${crumb.title}"`);
    return {
      url: crumb.link,
      userData: {
        label: Labels.SUB_CATEGORIES,
        crumbs: [...request.userData.crumbs, crumb]
      }
    };
  });
}

function catProductsFromSubCategoriesRequests({ request }) {
  const categoriesFromBottomToTop = [...request.userData.crumbs].reverse();
  log.debug(`Hit rock bottom at ${categoriesFromBottomToTop.length}. level`);

  return categoriesFromBottomToTop.map(category => {
    log.debug(`Queued products of very bottom category "${category.title}"`);
    return {
      url: `${category.link}?page=1`,
      userData: {
        label: Labels.CAT_PRODUCTS,
        category,
        page: 1
      }
    };
  });
}

/**
 * Hornbach renders listings from an Apollo cache embedded in the page, which
 * carries the products and the page count that the DOM only shows as prose.
 * @param {ReturnType<typeof parseHTML>["document"]} document
 * @param {string} url
 */
function parseCategoryListing(document, url) {
  const script = Array.from(document.querySelectorAll("script")).find(s => s.innerText.includes("__APOLLO_STATE__"));
  if (!script) {
    log.error(`No Apollo state found in ${url}`);
    return null;
  }
  // Anchor on the assignment rather than the first brace in the tag: the same
  // script also assigns __ARTICLE_LISTING_BUGSNAG_CONF after the state object.
  const text = script.innerText;
  const bugsnagAt = text.indexOf("window.__ARTICLE_LISTING_BUGSNAG_CONF");
  const stateOnly = bugsnagAt === -1 ? text : text.slice(0, bugsnagAt);
  const start = stateOnly.indexOf("{", stateOnly.indexOf("__APOLLO_STATE__"));
  const end = stateOnly.lastIndexOf("}") + 1;
  if (start === -1 || end <= start) {
    log.error(`Could not locate the Apollo state object in ${url}`);
    return null;
  }
  const json = stateOnly.slice(start, end);
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    log.error(`Failed to parse Apollo state in ${url}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
  const key = Object.keys(data.ROOT_QUERY ?? {}).find(k => k.includes("categoryListing"));
  if (!key) {
    log.error(`No categoryListing in Apollo state of ${url}`);
    return null;
  }
  return data.ROOT_QUERY[key];
}

function catProductsRequests({ listing, request }) {
  if (request.userData.page !== 1) return [];

  const { category } = request.userData;
  const pagesCount = Number(listing.pageCount ?? 0);
  log.debug(`Category ${category.link} has ${pagesCount} pages`);

  return restPageUrls(pagesCount, page => ({
    url: `${category.link}?page=${page}`,
    userData: {
      label: Labels.CAT_PRODUCTS,
      category,
      page
    }
  }));
}

function extractProducts({ listing, stats, country, request }) {
  const productsInfoArray = (listing.itemList ?? []).filter(item => item?.abstractProductId);

  return productsInfoArray.map(item => {
    const currency = Currency[country.toUpperCase()];
    stats.inc("items");

    return {
      itemId: item.abstractProductId,
      itemUrl: completeUrl(country, item.url),
      itemName: item.title,
      img: item?.mainImage?.thumbnailUrl,
      currentPrice: item.defaultPrice?.price ?? "",
      currentUnitPrice: item.basicPrice?.price ?? "",
      category: {
        ...request.userData.category
      },
      currency
    };
  });
}

function filterTestRequests({ requests, type, take = 2 }) {
  return type === ActorType.Test ? requests.slice(0, take) : requests;
}

async function main() {
  rollbar.init();

  const stats = await withPersistedStats({
    categories: 0,
    items: 0,
    blocked: 0,
    failed: 0
  });

  const {
    type = ActorType.Full,
    country = Country.CZ,
    debug = false,
    maxRequestRetries,
    maxRequestsPerMinute = 600,
    maxConcurrency = 10
  } = await getInput({ maxRequestRetries: 8 });

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  log.debug(`Running in ${type} mode`);

  if ([ActorType.Test, ActorType.Full].includes(type) === false) {
    log.error(`Actor type ${type} not yet implemented`);
    return;
  }

  const rootUrl = `https://www.hornbach.${country.toLowerCase()}`;
  const locale = Locale[country.toUpperCase()] ?? Locale.CZ;

  // Phase 1 — Solver: earn a Fastly challenge-passed session.
  let cookies = await solveChallenge(rootUrl, locale);

  // Phase 2 — Executor: impit with a Chrome TLS fingerprint.
  log.info("Executor: initializing impit (chrome TLS)");
  let impit = newExecutor();

  // Any challenged response means re-solve: a solver run on an IP Fastly happens
  // not to be challenging clears the page without a pass cookie, and then only a
  // real solve can protect the executor — retries alone cannot. A mutex
  // (in-flight promise) keeps concurrent workers from stampeding cloakbrowser.
  /** @type {Promise<void> | null} */
  let solvePromise = null;
  /** @param {string} reason */
  async function triggerResolve(reason) {
    if (solvePromise) return solvePromise;
    solvePromise = (async () => {
      try {
        log.warning(`Fastly re-solve triggered: ${reason}`);
        cookies = await solveChallenge(rootUrl, locale);
      } finally {
        solvePromise = null;
      }
    })();
    return solvePromise;
  }

  const crawler = new BasicCrawler({
    maxRequestRetries,
    maxRequestsPerMinute,
    maxConcurrency,
    async requestHandler({ request, crawler, log }) {
      if (solvePromise) await solvePromise;

      const label = request.userData.label;
      log.debug(`Processing ${request.url} (${label})`);

      const client = impit;
      const { status, body } = await executorFetch(client, cookies, request.url, locale.acceptLanguage);

      if (isChallenge(body)) {
        stats.inc("blocked");
        // Retire the poisoned jar, but only once per client — the other workers
        // holding the same instance would otherwise each rotate it again.
        if (client === impit) impit = newExecutor();
        await triggerResolve(`client challenge on ${request.url} (status=${status}, ${body.length}b)`);
        throw new Error("Fastly client challenge, retrying on a fresh session");
      }
      if (status !== 200) {
        throw new Error(`Unexpected status ${status} for ${request.url}`);
      }

      const { document } = parseHTML(body);

      switch (label) {
        case Labels.TOP_CATEGORIES:
          {
            const requests = topCategoriesRequests({ document, country });
            const filtered = filterTestRequests({ requests, type });
            await crawler.requestQueue.addRequests(filtered, { forefront: true });
          }
          break;
        case Labels.SUB_CATEGORIES:
          {
            const links = document.querySelectorAll(Selectors.SUB_CATEGORIES);
            if (links.length) {
              const requests = subCategoriesRequests({
                document,
                country,
                request,
                stats
              });
              await crawler.requestQueue.addRequests(filterTestRequests({ requests, type }), { forefront: true });
            } else {
              const requests = catProductsFromSubCategoriesRequests({
                request
              });
              await crawler.requestQueue.addRequests(filterTestRequests({ requests, type }));
            }
          }
          break;
        case Labels.CAT_PRODUCTS:
          {
            const listing = parseCategoryListing(document, request.url);
            if (!listing) return;
            const requests = catProductsRequests({ listing, request });
            await crawler.requestQueue.addRequests(filterTestRequests({ requests, type }));
            const products = extractProducts({ listing, stats, country, request });
            await Dataset.pushData(products);
          }
          break;
        default:
          log.warning(`Unknown label ${label}`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startUrl = `${rootUrl}/c/`;
  await crawler.run([
    {
      url: startUrl,
      userData: {
        label: Labels.TOP_CATEGORIES
      }
    }
  ]);

  if (type === ActorType.Full && Actor.isAtHome()) {
    await Promise.all([stats.save(true), uploadToKeboola(shopName(startUrl))]);
  }

  log.info("Finished.");
}

await Actor.main(main);
