import { BasicCrawler, useState } from "@crawlee/basic";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput, restPageUrls } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, log } from "apify";
import { launchContext as launchCloakContext } from "cloakbrowser";
import { Impit } from "impit";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Labels = {
  START: "START",
  COUNT: "COUNT",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};

/** @enum {string} */
const Country = {
  CZ: "CZ",
  SK: "SK"
};

const rootCZ = "https://www.datart.cz";
const rootSK = "https://www.datart.sk";

async function countAllProducts({ body, stats }) {
  const { document } = parseXML(body);
  const productXmlUrls = document.querySelectorAll("sitemap loc").map(loc => loc.innerText.trim());
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for (const xmlUrl of productXmlUrls) {
    const res = await fetch(xmlUrl);
    const body = await res.text();
    const { document } = parseXML(body);
    let readyForProductsLink = false;
    document.querySelectorAll("url priority").forEach(priority_ => {
      const priority = priority_.innerText.trim();
      // Will count only products link with priority "0.9" starting after category links with priority "0.5"
      if (priority === "0.9" && readyForProductsLink) {
        stats.inc("items");
      } else if (priority === "0.5" && !readyForProductsLink) {
        readyForProductsLink = true;
      }
    });
  }
  log.info(`Total items ${stats.get().items}x`);
}

// ---------------------------------------------------------------------------
// Solver: cloakbrowser → F5 BIG-IP Bot Defense challenge → TSPD cookies
// ---------------------------------------------------------------------------
// Datart is protected by F5 Advanced WAF + Bot Defense. Non-browser HTTP
// clients (node fetch, got-scraping, curl with OpenSSL TLS) receive a 6.7 KB
// JS-challenge stub from Apify datacenter IPs. Real Chromium passes the
// challenge because it executes the /TSPD/?type=12 sensor script, which
// POSTs back a fingerprint and receives upgraded TS01.../TS25... session
// cookies. cloakbrowser is a stealth-patched Chromium that passes this
// challenge headlessly. See topmonks/hlidac-shopu#3520.
//
// Inspired by yfe404/turnstile-unblocker: two-phase solver/executor split.

/**
 * Launch cloakbrowser, navigate to the catalog, poll until F5 issues TSPD
 * cookies, return the full cookie jar.
 * @param {string} rootUrl
 * @returns {Promise<Record<string,string>>}
 */
async function solveF5(rootUrl) {
  log.info("Solver: launching cloakbrowser to solve F5 Bot Defense challenge…");
  const ctx = await launchCloakContext({
    headless: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague"
  });
  try {
    const page = await ctx.newPage();
    await page.goto(`${rootUrl}/katalog`, { waitUntil: "domcontentloaded", timeout: 60000 });

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const jar = await ctx.cookies(rootUrl);
      const hasTspd = jar.some(c => c.name.startsWith("TS"));
      const hasBigIp = jar.some(c => c.name.startsWith("BIGipServer"));
      if (hasTspd && hasBigIp) {
        const cookies = Object.fromEntries(jar.map(c => [c.name, c.value]));
        log.info(`Solver: F5 session solved (${jar.length} cookies, TSPD+BIGipServer present)`);
        return cookies;
      }
      await page.waitForTimeout(1000);
    }
    throw new Error("Solver: timed out waiting for TSPD cookie from F5");
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Executor: impit (chrome136 TLS fingerprint) + solved cookies
// ---------------------------------------------------------------------------
// F5 Bot Defense checks the TLS fingerprint on every request, not just the
// cookies. Got-scraping / node fetch / curl-OpenSSL all present a non-Chrome
// TLS handshake and get 403 even with valid TSPD cookies. impit is a Rust/
// napi-rs library that impersonates Chrome 136's TLS handshake from Node,
// so F5 accepts the cookies as genuinely browser-issued.

/**
 * Fetch a URL through impit with the solved F5 cookies injected.
 * @param {Impit} impit
 * @param {Record<string,string>} cookies
 * @param {string} url
 * @returns {Promise<{status: number, body: string}>}
 */
async function executorFetch(impit, cookies, url) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const res = await impit.fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
      "Upgrade-Insecure-Requests": "1"
    }
  });
  return { status: res.status, body: await res.text() };
}

/**
 *
 * @param {Document} document
 * @param {string} rootUrl
 * @param {Country} country
 * @returns {Object[]}
 */
function extractItems(document, rootUrl, country) {
  // Datart's modern breadcrumb uses a BEM-like class (`c-breadcrumb`,
  // `breadcrumbs`, etc. depending on frontend version), not `ol.breadcrumb`.
  // Match any element whose class contains "breadcrumb" and drop empty
  // entries (the home icon link has no text).
  const categories = document
    .querySelectorAll('[class*="breadcrumb"] a')
    .map(a => a.innerText.trim())
    .filter(t => t.length > 0);

  return document
    .querySelectorAll("div.product-box-list div.product-box")
    .filter(productEl => productEl.getAttribute("data-track"))
    .map(productEl => {
      const productBoxTopSide = productEl.querySelector("div.product-box-top-side");
      const productHeader = productBoxTopSide.querySelector("div.item-title-holder h3.item-title a");
      // Datart list pages advertise availability in several states. We treat
      // anything the shopper can actually obtain as in-stock — that means not
      // just "ships immediately" but also "last piece", "at the supplier",
      // and "available in physical store(s)". Only the two explicit out-of-
      // stock texts ("Není skladem", "Očekáváme do …") force false.
      //   Class modifiers on div.product-availability-eshop:
      //     --inStock   → "Ihned k odeslání"       (ships immediately)
      //     --lastPiece → "Poslední kus k odeslání" (last piece)
      //     (bare)      → state text decides       (U dodavatele / Není skladem / Očekáváme do …)
      //   No eshop element at all → product only available for in-store pickup,
      //   shown via div.product-availability-reservation ("Skladem v N prodejnách").
      const availEshopEl = productEl.querySelector("div.product-availability-eshop");
      const availEshopClass = availEshopEl?.getAttribute("class") || "";
      const stateText = productEl.querySelector(".product-availability-state")?.textContent?.trim() || "";
      const storeReservationEl = productEl.querySelector("div.product-availability-reservation");
      const isExplicitlyOut = /není\s*sklad/i.test(stateText) || /očekáváme/i.test(stateText);
      const isImmediate = availEshopClass.includes("--inStock");
      const isLastPiece = availEshopClass.includes("--lastPiece");
      const isFromSupplier = /u\s*dodavatele/i.test(stateText);
      const inStock = !isExplicitlyOut && (isImmediate || isLastPiece || isFromSupplier || Boolean(storeReservationEl));

      const result = {
        inStock,
        currency: country === Country.CZ ? "CZK" : "EUR",
        category: categories,
        itemName: productHeader.innerText.trim(),
        itemUrl: `${rootUrl}${productHeader.href}`,
        img: productBoxTopSide.querySelector("div.item-thumbnail img").getAttribute("src")
      };

      const productBoxBuyInfoCart = productEl.querySelector("div.product-box-buy-info > div.product-box-buy-info-cart");
      const itemCartDataTarget = productBoxBuyInfoCart
        .querySelector("div.item-link-compare button")
        .getAttribute("data-target-add");
      if (itemCartDataTarget) {
        const searchParams = new URLSearchParams(itemCartDataTarget);
        result.itemId = searchParams.get("id");
      }
      const currentPrice = parseFloat(
        productBoxBuyInfoCart
          .querySelector("div.item-price div.actual")
          .innerText.trim()
          .replace(/[^\d,]+/g, "")
          .replace(",", ".")
      );

      let lowestPriceInLastMonth = currentPrice;
      const lowestPriceInLastMonthEl = productBoxBuyInfoCart.querySelector("div.item-price span.cut-price--strike");
      if (lowestPriceInLastMonthEl) {
        // Remove sr-only content first to avoid extracting digits from screen reader text
        const srOnly = lowestPriceInLastMonthEl.querySelector('.sr-only');
        const priceText = srOnly
          ? lowestPriceInLastMonthEl.innerText.replace(srOnly.innerText, '').trim()
          : lowestPriceInLastMonthEl.innerText.trim();

        lowestPriceInLastMonth = parseFloat(
          priceText
            .replace(/[^\d,]+/g, "")
            .replace(",", ".")
        );
      }
      let fixedDiscount = 0;
      const fixedDiscountFlagEl = productEl.querySelector(".product-flags .flag-color-red");
      if (fixedDiscountFlagEl) {
        const hasDiscountKeyword = country === Country.CZ && /extra sleva/i.test(fixedDiscountFlagEl.textContent);
        if (hasDiscountKeyword) {
          fixedDiscount = parseFloat(
            fixedDiscountFlagEl.innerText
              .trim()
              .replace(/[^\d,]+/g, "")
              .replace(",", ".")
          );
        }
      }

      let percentageDiscount = 0;
      const percentageDiscountFlagEls = productEl.querySelectorAll(".product-flags .flag");
      Array.from(percentageDiscountFlagEls).forEach((flagEl) => {
        const hasDiscountKeyword = country === Country.CZ && (
          /^sleva\s+\d+\s*%$/i.test(flagEl.textContent) // 20 % sleva
          || /^\d+\s*%\s*sleva$/i.test(flagEl.textContent) // sleva 20 %
        );

        if (hasDiscountKeyword) {
          percentageDiscount = parseFloat(
            flagEl.innerText
              .trim()
              .replace(/[^\d,]+/g, "")
              .replace(",", ".")
          );
        }
      });

      result.originalPrice = lowestPriceInLastMonth;
      result.currentPrice = currentPrice;

      if (percentageDiscount > 0) {
        result.currentPrice -= (currentPrice * percentageDiscount) / 100;
        result.discounted = true;
      } else if (fixedDiscount > 0) {
        result.currentPrice -= fixedDiscount;
        result.discounted = true;
      } else {
        result.currentPrice = currentPrice;
        result.discounted = lowestPriceInLastMonth > currentPrice;
      }

      return result;
    });
}

/**
 * Parse pagination page-link `href`s of the form `.../televize.html?page=44`
 * and return the highest page number, or 0 if there's no pagination. More
 * robust than the old arrow-position approach because it works regardless of
 * whether Prev/Next arrows or ellipses are present.
 * @param {Element[]} links
 */
function getLastPageNumber(links) {
  let max = 0;
  for (const a of links) {
    const href = a.getAttribute?.("href") || "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return max;
}

function startingRequest({ rootUrl, country, type }) {
  if (type === ActorType.BlackFriday) {
    return {
      url: `${rootUrl}/black-friday`,
      userData: {
        label: Labels.BF
      }
    };
  } else if (type === "COUNT") {
    return {
      url: `${rootUrl}/sitemap/sitemapindex.xml`,
      userData: {
        label: Labels.COUNT
      }
    };
  } else if (type === ActorType.Full) {
    return {
      url: `${rootUrl}/katalog`,
      userData: {
        label: Labels.START
      }
    };
  } else if (type === ActorType.Test && country === Country.CZ) {
    return {
      url: `https://www.datart.cz/televize.html`,
      userData: {
        label: Labels.CATEGORY
      }
    };
  } else if (type === ActorType.Test && country === Country.SK) {
    return {
      url: `https://www.datart.sk/televizory.html`,
      userData: {
        label: Labels.CATEGORY
      }
    };
  }
}

async function enqueueNewUrls({ requestQueue, processedUrls, urls, forefront = false, stats }) {
  const newUrls = [];
  for (const request of urls) {
    if (!processedUrls[request.url]) {
      processedUrls[request.url] = true;
      newUrls.push(request);
    } else {
      stats.inc("urlDuplicity");
      log.info(`URL ${request.url} already enqueued`);
    }
  }
  await requestQueue.addRequests(newUrls, { forefront });
}

export async function main() {
  rollbar.init();

  const {
    development,
    maxRequestRetries,
    proxyGroups = ["CZECH_LUMINATI"],
    country = Country.CZ,
    type = ActorType.Full
  } = await getInput();
  const processedUrls = await useState("processedUrls", {});
  const processedIds = await useState("processedIds", {});

  const stats = await withPersistedStats({
    categories: 0,
    pages: 0,
    items: 0,
    urlDuplicity: 0,
    itemsDuplicity: 0,
    itemsChanged: 0,
    failed: 0,
    blocked: 0
  });

  const rootUrl = country === Country.CZ ? rootCZ : rootSK;

  // Phase 1 — Solver: cloakbrowser earns a validated F5 session
  let f5Cookies = await solveF5(rootUrl);

  // Phase 2 — Executor: impit with chrome136 TLS fingerprint.
  // Impit impersonates Chrome's TLS handshake from Node, so F5 accepts the
  // TSPD cookies the solver earned as genuinely browser-issued.
  log.info("Executor: initializing impit with chrome136 TLS fingerprint");
  const impit = new Impit({ browser: "chrome136" });

  // F5 burns sessions after ~30–40 requests: instead of returning 403 or the
  // challenge stub, it silently replies 200 with a decoy body that lacks the
  // real product grid. We detect that via body signature and re-solve. Only
  // one re-solve runs at a time (mutex via an in-flight promise) so the 20
  // concurrent workers don't stampede cloakbrowser.
  let solvePromise = null;
  async function triggerResolve(reason) {
    if (solvePromise) return solvePromise;
    solvePromise = (async () => {
      try {
        log.warning(`F5 re-solve triggered: ${reason}`);
        f5Cookies = await solveF5(rootUrl);
      } finally {
        solvePromise = null;
      }
    })();
    return solvePromise;
  }

  log.info("ACTOR - setUp crawler");
  const crawler = new BasicCrawler({
    maxRequestRetries,
    maxRequestsPerMinute: 100,
    maxConcurrency: 20,
    async requestHandler({ request, log, crawler }) {
      if (solvePromise) await solvePromise;
      const { status, body } = await executorFetch(impit, f5Cookies, request.url);

      // Hard block — 403 or the explicit challenge stub.
      if (status === 403 || (body.includes("/TSPD/") && body.length < 15000)) {
        stats.inc("blocked");
        await triggerResolve(`hard block on ${request.url} (status=${status}, ${body.length}b)`);
        throw new Error("F5 session re-solved, retrying request");
      }

      // Silent decoy — 200 OK, but the body lacks the product/category
      // markers AND is small enough to be an F5 decoy. Observed F5 decoy
      // bodies cluster at 53–60 KB; legitimate non-product landing pages
      // (editorial/service pages like /retro-spotrebice, /dtest-*) are
      // ~1.6 MB. A 100 KB threshold cleanly separates the two clusters,
      // so we only re-solve on small bodies. The XML sitemap path (COUNT)
      // is exempt. The marker set covers every product-bearing label:
      // START → microsite-katalog / category-submenu; CATEGORY →
      // product-box-list / subcategory-box-list / category-tree-box-list;
      // BF → ms-category-box; everything deeper carries breadcrumb.
      if (request.userData.label !== Labels.COUNT) {
        const looksLikeDatart =
          body.includes("product-box-list")
          || body.includes("subcategory-box-list")
          || body.includes("category-tree-box-list")
          || body.includes("microsite-katalog")
          || body.includes("category-submenu")
          || body.includes("ms-category-box")
          || body.includes("breadcrumb");
        if (!looksLikeDatart && body.length < 100_000) {
          stats.inc("blocked");
          await triggerResolve(`decoy response on ${request.url} (${body.length}b, no datart markers)`);
          throw new Error("F5 session re-solved, retrying request");
        }
      }

      if (request.userData.label === Labels.COUNT) {
        await countAllProducts({ body, stats });
        return;
      }
      const { document } = parseHTML(body);
      if (request.userData.label === Labels.START) {
        const urls = document.querySelectorAll("div.microsite-katalog ul.category-submenu > li > a").map(a => ({
          url: `${rootUrl}${a.href}`,
          userData: {
            label: Labels.CATEGORY
          }
        }));
        log.info(`${request.url} Found ${urls.length} categories`);
        await enqueueNewUrls({
          requestQueue: crawler.requestQueue,
          processedUrls,
          urls,
          forefront: true,
          stats
        });
      }
      if (request.userData.label === Labels.CATEGORY) {
        // Add subcategories if this category has also products
        const subcategories = document.querySelectorAll("div.subcategory-box-list .subcategoryWrapper a");
        if (subcategories.length > 0) {
          const urls = subcategories.map(a => ({
            url: `${rootUrl}${a.href}`,
            userData: {
              label: Labels.CATEGORY
            }
          }));
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} subcategories`);
          await enqueueNewUrls({
            requestQueue: crawler.requestQueue,
            processedUrls,
            urls,
            forefront: true,
            stats
          });
          return; // Nothing more we can do for this page
        }
        // Add categories if this page has only categories and no products
        const categoryTree = document.querySelectorAll("div.category-tree-box-list a");
        if (categoryTree.length > 0) {
          const urls = categoryTree.map(a => ({
            url: `${rootUrl}${a.href}`,
            userData: {
              label: Labels.CATEGORY
            }
          }));
          stats.add("categories", urls.length);
          log.info(`${request.url} Found ${urls.length} categories`);
          await enqueueNewUrls({
            requestQueue: crawler.requestQueue,
            processedUrls,
            urls,
            forefront: true,
            stats
          });
          return; // Nothing more we can do for this page
        }
        // No more categories and subcategories continue with find maxPaginationPage.
        // Datart's modern paginator renders `ul.pagination a.page-link` directly
        // (no `div.pagination-wrapper`) with hrefs like `?page=44`. The legacy
        // `?showPage&page=N&limit=16` query form is no longer used by the site.
        const lastPagination = getLastPageNumber(document.querySelectorAll("ul.pagination a.page-link"));
        const urls = restPageUrls(lastPagination, i => ({
          url: `${request.url}?page=${i}`,
          userData: {
            label: Labels.CATEGORY_NEXT
          }
        }));
        stats.add("pages", urls.length);
        log.info(`${request.url} Adding ${urls.length} pagination pages`);
        await enqueueNewUrls({
          requestQueue: crawler.requestQueue,
          processedUrls,
          urls,
          stats
        });
      }
      if (request.userData.label === Labels.CATEGORY || request.userData.label === Labels.CATEGORY_NEXT) {
        const products = extractItems(document, rootUrl, country);
        for (const product of products) {
          if (processedIds[product.itemId] !== product.currentPrice) {
            if (processedIds[product.itemId]) {
              stats.inc("itemsChanged");
              log.info(
                `Product ${product.itemId} changed price from ${
                  processedIds[product.itemId]
                } to ${product.currentPrice}`
              );
            }
            processedIds[product.itemId] = product.currentPrice;
            await Dataset.pushData(product);
          } else {
            stats.inc("itemsDuplicity");
            log.info(`ID ${product.itemId} already saved`);
          }
        }
        log.info(`${request.url} Found ${products.length} products`);
      }
      if (request.userData.label === Labels.BF) {
        log.info(`START BF ${request.url}`);
        const urls = document.querySelectorAll(".ms-category-box").map(a => ({
          url: `${rootUrl}${a.href}`,
          userData: {
            label: Labels.CATEGORY
          }
        }));
        log.info(`Found ${urls.length} BF categories`);
        await enqueueNewUrls({
          requestQueue: crawler.requestQueue,
          processedUrls,
          urls,
          forefront: true,
          stats
        });
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const request = startingRequest({ rootUrl, country, type });
  await crawler.run([request]);
  await stats.save(true);

  try {
    let tableName = "";

    if (type === ActorType.Full && country === "CZ") {
      tableName = "datart";
    } else if (type === ActorType.Full && country === "SK") {
      tableName = "datart_sk";
    } else if (type !== ActorType.Full && country === "CZ") {
      tableName = "datart_bf";
    } else if (type !== ActorType.Full && country === "SK") {
      tableName = "datart_sk_bf";
    }

    if (!development) {
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    }
  } catch (e) {
    log.error(e);
  }

  log.info("Finished.");
}

await Actor.main(main, { statusMessage: "DONE" });
