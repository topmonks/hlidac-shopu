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
import { randomUUID } from "node:crypto";

/** @typedef {import("linkedom/types/interface/document").Document} Document */

/** @enum {string} */
const Labels = {
  START: "START",
  COUNT: "COUNT",
  CATEGORY: "CATEGORY",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF",
  DETAIL: "DETAIL"
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
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
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

// ---------------------------------------------------------------------------
// CZ-Full anonymous voucher price via Bloomreach/Exponea (replaces detail fetch)
// ---------------------------------------------------------------------------
// Datart's "AutomatickaSleva" category auto-discount is computed CLIENT-SIDE by a
// Bloomreach Engagement weblayer; it is NOT in the server HTML impit fetches, which
// is why the old design fetched a ~1.6 MB detail page per SKU just to read the
// resulting server-rendered `.price-finally`. The same data is available in bulk:
// POST a batch of product match-codes to the weblayer's "multiCategoryExecutor" and
// the server returns, per product, its anonymous (voucher_group "other") voucher.
// Final anonymous price = price - voucher_value, the exact number `.price-finally`
// and the detail JSON-LD render. ctd-api is Exponea infra, NOT behind datart's F5,
// so these POSTs are cheap and never burn an F5 session. company_id/banner_id are
// INPUT-configurable (marketing can rotate the campaign); a stale id is caught
// loudly by the parity circuit-breaker (see main), never silently mis-priced.
const VOUCHER_API_URL = "https://ctd-api.datart.cz/campaigns/banners/show";
const DEFAULT_EXPONEA_COMPANY_ID = "aeb32f50-0652-11ec-bb4f-863dd5b8e706";
const DEFAULT_VOUCHER_BANNER_ID = "699b4808f52cdfb8c2466612"; // multiCategoryExecutor
const VOUCHER_BATCH_SIZE = 50;
const PRICE_TOLERANCE = 1; // Kč; rounding slack for parity / price-mismatch checks
const PARITY_PER_STRATUM = 50;

/** Strip internal-only fields before pushing a product to the dataset. */
function stripInternal(product) {
  const { matchCode, basePrice, listingDiscountFlag, ...rest } = product;
  return rest;
}

/** Deep-walk a parsed JSON value, collecting product payloads (match + price + vouchers). */
function collectProducts(node, byMatch) {
  if (Array.isArray(node)) {
    for (const n of node) collectProducts(n, byMatch);
  } else if (node && typeof node === "object") {
    if (typeof node.match === "string" && node.price != null && "vouchers" in node) {
      byMatch.set(node.match, node);
    }
    for (const k of Object.keys(node)) {
      if (node[k] && typeof node[k] === "object") collectProducts(node[k], byMatch);
    }
  }
}

/**
 * Extract the per-product voucher catalog the weblayer embeds in its JS response,
 * WITHOUT eval. The catalog lives in a `<var> = JSON.parse('[...]')` literal whose
 * variable/nesting differs per weblayer (executor: formats[].campaigns[].campaignProducts;
 * renderer: this.products), so we parse EVERY JSON.parse payload and deep-walk it for
 * product objects. Throws on schema surprises so the run aborts loudly, never mis-prices.
 * @param {string} responseText
 * @returns {Map<string, object>} match-code -> product payload
 */
function parseVoucherResponse(responseText) {
  let outer;
  try {
    outer = JSON.parse(responseText);
  } catch {
    throw new Error("voucher api: response is not JSON");
  }
  if (outer.success !== true) throw new Error("voucher api: response success !== true");
  const js = Array.isArray(outer.data) ? outer.data.join("\n") : "";
  const byMatch = new Map();
  const marker = "JSON.parse('";
  let any = false;
  for (let mk = js.indexOf(marker); mk !== -1; mk = js.indexOf(marker, mk + 1)) {
    const from = mk + marker.length;
    // Terminator = first `'` not preceded by a backslash (robust to apostrophes).
    let end = -1;
    for (let i = from; i < js.length; ) {
      const q = js.indexOf("'", i);
      if (q === -1) break;
      if (js[q - 1] !== "\\") {
        end = q;
        break;
      }
      i = q + 1;
    }
    if (end === -1) break;
    mk = end;
    const jsonStr = js.slice(from, end).replace(/\\'/g, "'");
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      continue; // not every JSON.parse literal is the catalog (styles, formats meta, …)
    }
    any = true;
    collectProducts(parsed, byMatch);
  }
  if (!any) throw new Error("voucher api: no JSON.parse payloads found in response");
  return byMatch;
}

/**
 * POST a batch of product match-codes to the executor weblayer and return the
 * per-match product payloads (price + vouchers).
 * @param {string[]} matchCodes
 * @param {{companyId:string, bannerId:string, cookie:string}} cfg
 * @returns {Promise<Map<string, object>>}
 */
async function fetchVouchersBatch(matchCodes, { companyId, bannerId, cookie }) {
  const res = await fetch(VOUCHER_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: rootCZ,
      referer: `${rootCZ}/`
    },
    body: JSON.stringify({
      company_id: companyId,
      customer_ids: { cookie },
      banner_ids: [bannerId],
      params: { productIds: matchCodes },
      initiator: "manual"
    })
  });
  if (!res.ok) throw new Error(`voucher api: HTTP ${res.status}`);
  return parseVoucherResponse(await res.text());
}

/**
 * Pick the single anonymous (voucher_group "other") voucher we know how to apply.
 * Anything we don't fully understand returns { ambiguous } so the caller falls back
 * to a real detail fetch instead of guessing a price.
 * @param {object} payload
 * @returns {{value:number}|{ambiguous:true, reason:string}}
 */
function selectAnonymousVoucher(payload) {
  const raw = payload.vouchers;
  const vouchers = raw == null ? [] : Array.isArray(raw) ? raw : null;
  if (vouchers === null) return { ambiguous: true, reason: "vouchers_not_array" };
  const other = vouchers.filter(v => v && v.voucher_group === "other");
  if (other.length === 0) return { value: 0 };
  if (other.length > 1) return { ambiguous: true, reason: "multiple_other_vouchers" };
  const v = other[0];
  // voucher_type 2 = a fixed Kč amount subtracted from price (verified live).
  if (Number(v.voucher_type) !== 2) return { ambiguous: true, reason: `voucher_type_${v.voucher_type}` };
  const value = Number.parseInt(v.voucher_value, 10);
  if (!Number.isFinite(value) || value <= 0) return { ambiguous: true, reason: "bad_voucher_value" };
  return { value };
}

/**
 * Decide the anonymous currentPrice for a listing product from its voucher-API
 * payload. Returns a push decision (price known) or a detail-fetch fallback for any
 * missing/ambiguous case. Never silently base-prices an ambiguous product.
 * @param {object} product  extractItems row (basePrice, listingDiscountFlag, originalPrice)
 * @param {object|undefined} payload  voucher-API payload for this match-code
 */
function decidePrice(product, payload) {
  if (!payload) return { action: "detail", reason: "api_missing" };
  const apiPrice = Number(payload.price);
  if (!Number.isFinite(apiPrice) || apiPrice <= 0) return { action: "detail", reason: "api_bad_price" };
  if (Math.abs(apiPrice - product.basePrice) > PRICE_TOLERANCE) return { action: "detail", reason: "price_mismatch" };
  const sel = selectAnonymousVoucher(payload);
  if (sel.ambiguous) return { action: "detail", reason: sel.reason };
  if (sel.value > 0) {
    return { action: "push", stratum: "coupon", currentPrice: apiPrice - sel.value, discounted: true };
  }
  // API reports no anonymous voucher. If the LISTING nonetheless shows a discount
  // flag, the API may be a false-negative -> verify on the detail page.
  if (product.listingDiscountFlag) return { action: "detail", reason: "flag_no_api_voucher" };
  return { action: "push", stratum: "novoucher", currentPrice: apiPrice, discounted: product.originalPrice > apiPrice };
}

/** Coupon price from the detail page (server-rendered `.price-finally`), or null. */
function detailCouponPrice(document) {
  const el = document.querySelector(".product-price-discount.discount-price-box .price-finally");
  if (!el) return null;
  const v = parseFloat(el.innerText.trim().replace(/[^\d,]+/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

/**
 * The detail page's displayed anonymous price, read from the product's GTM data
 * attribute. Parity oracle for non-coupon products. NOTE: we deliberately do NOT use
 * the detail JSON-LD offer price — on /bazar/ (used) pages it wrongly echoes the NEW
 * product's price (e.g. 4490 while the unit actually sells for 3637); the GTM `price`
 * is correct there.
 */
function detailDisplayedPrice(document) {
  const el =
    document.querySelector(".product-detail[data-gtm-data-product]") ||
    document.querySelector("[data-gtm-data-product]");
  if (!el) return null;
  try {
    const n = Number(JSON.parse(el.getAttribute("data-gtm-data-product")).price);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Breadcrumb category names (drops the empty home-icon link). */
function breadcrumbCategories(document) {
  // Datart's modern breadcrumb uses a BEM-like class (`c-breadcrumb`,
  // `breadcrumbs`, etc. depending on frontend version), not `ol.breadcrumb`.
  return document
    .querySelectorAll('[class*="breadcrumb"] a')
    .map(a => a.innerText.trim())
    .filter(t => t.length > 0);
}

/**
 * Extract just the product-grid element (`div.product-box-list`, ~8% of the 2.1 MB
 * listing page) from RAW html via a precise class-token + balanced-<div> scan, so
 * deep-pagination pages parse ~10x less (the full-DOM build is CPU-bound at 4 GB and
 * caps concurrency). Returns null if not cleanly found / no products — the caller then
 * full-parses. Used ONLY for CATEGORY_NEXT; START/CATEGORY/DETAIL need the rest of the page.
 * @param {string} html
 * @returns {string|null}
 */
function extractProductGridHtml(html) {
  const lower = html.toLowerCase();
  const isBoundary = c => c === " " || c === ">" || c === "\t" || c === "\n" || c === "\r" || c === "/";
  // class must contain `product-box-list` as a WHOLE token (so it skips
  // `product-box-list-wrap`); `(?![\w-])` rejects longer tokens.
  const tokenOk = openTag => /class\s*=\s*["'][^"']*\bproduct-box-list(?![\w-])/i.test(openTag);
  let from = 0;
  while (true) {
    const o = lower.indexOf("<div", from);
    if (o === -1) return null;
    from = o + 4;
    const gt = html.indexOf(">", o);
    if (gt === -1) return null;
    if (!isBoundary(html[o + 4]) || !tokenOk(html.slice(o, gt + 1))) continue;
    // balanced <div> scan for this candidate
    let depth = 1;
    let i = gt + 1;
    let grid = null;
    while (i < html.length) {
      const no = lower.indexOf("<div", i);
      const nc = lower.indexOf("</div", i);
      if (nc === -1) break; // unbalanced → abandon this candidate
      if (no !== -1 && no < nc) {
        if (isBoundary(html[no + 4])) depth++;
        i = no + 4;
      } else {
        depth--;
        i = nc + 5;
        if (depth === 0) {
          const end = html.indexOf(">", i);
          if (end !== -1) grid = html.slice(o, end + 1);
          break;
        }
      }
    }
    // accept only a balanced grid that actually holds products; else try the next candidate
    if (grid && grid.includes("data-product-match")) return grid;
  }
}

/**
 *
 * @param {Document} document
 * @param {string} rootUrl
 * @param {Country} country
 * @param {string[]} [categoryOverride] breadcrumb categories propagated from the first
 *   category page (CATEGORY_NEXT slices have no breadcrumb).
 * @returns {Object[]}
 */
function extractItems(document, rootUrl, country, categoryOverride) {
  const categories = categoryOverride ?? breadcrumbCategories(document);

  return document
    .querySelectorAll("div.product-box-list div.product-box")
    .filter(productEl => productEl.getAttribute("data-track"))
    .map(productEl => {
      const productBoxTopSide = productEl.querySelector("div.product-box-top-side");
      // Datart's product title used to be an <h3 class="item-title">; the
      // current frontend renders it as <div class="item-title">. Match by the
      // `item-title` class regardless of tag so we survive that swap (a null
      // header here would throw and zero out the whole run — see #3559).
      const productHeader = productBoxTopSide.querySelector("div.item-title-holder .item-title a");
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
        img: productBoxTopSide.querySelector("div.item-thumbnail img").getAttribute("src"),
        // Bloomreach match-code (e.g. "LGGOLED55B56"); the key the voucher API uses.
        // Server-rendered on every box as `data-product-match`.
        matchCode: productEl.getAttribute("data-product-match")
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
        const srOnly = lowestPriceInLastMonthEl.querySelector(".sr-only");
        const priceText = srOnly
          ? lowestPriceInLastMonthEl.innerText.replace(srOnly.innerText, "").trim()
          : lowestPriceInLastMonthEl.innerText.trim();

        lowestPriceInLastMonth = parseFloat(priceText.replace(/[^\d,]+/g, "").replace(",", "."));
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
      Array.from(percentageDiscountFlagEls).forEach(flagEl => {
        const hasDiscountKeyword =
          country === Country.CZ &&
          (/^sleva\s+\d+\s*%$/i.test(flagEl.textContent) || // 20 % sleva
            /^\d+\s*%\s*sleva$/i.test(flagEl.textContent)); // sleva 20 %

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

      // Internal-only (stripped before push). basePrice = the raw listing price before
      // any flag math; the voucher-API path prices from this and uses listingDiscountFlag
      // to detect API false-negatives (a listing discount flag with no API voucher).
      result.basePrice = currentPrice;
      result.listingDiscountFlag = percentageDiscount > 0 || fixedDiscount > 0;

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
    type = ActorType.Full,
    exponeaCompanyId = DEFAULT_EXPONEA_COMPANY_ID,
    voucherBannerId = DEFAULT_VOUCHER_BANNER_ID,
    useVoucherApi: useVoucherApiInput,
    // Throughput knobs (configurable so they can be tuned without a redeploy). The
    // legacy detail-per-SKU design had to keep these low because every extra request
    // burned an F5 session; with detail fetches gone (and the voucher POSTs being inline
    // fetch() calls that don't count here) the listing crawl can run much faster.
    maxRequestsPerMinute = 200,
    maxConcurrency = 10
  } = await getInput();

  // The bulk voucher-API price path is verified for CZ only and is exercised by the
  // single-category TEST run too (so TEST actually covers it). SK/BF keep the legacy
  // per-product detail flow until separately verified. `useVoucherApi: false` forces
  // the legacy flow (emergency fallback if the campaign breaks).
  const voucherApiEnabled =
    (useVoucherApiInput ?? true) &&
    country === Country.CZ &&
    (type === ActorType.Full || type === ActorType.Test);
  const voucherCfg = { companyId: exponeaCompanyId, bannerId: voucherBannerId, cookie: randomUUID() };
  const parityTaken = { coupon: 0, novoucher: 0, bazar: 0 };

  // Product-grid slicing for CATEGORY_NEXT pages (parse only ~8% of the page). A runtime
  // canary shadow-compares the first N sliced pages against a full parse; any mismatch
  // disables slicing for the rest of the run (full parse is always correct).
  let gridSliceEnabled = true;
  let sliceCanaryRemaining = 50;
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
    blocked: 0,
    // Voucher-API path (CZ): coverage + integrity counters for the circuit-breaker.
    voucherApiCalls: 0,
    voucherApiFailed: 0,
    voucherRequested: 0,
    voucherReturned: 0,
    voucherApplied: 0,
    voucherFallback: 0,
    bazarDirect: 0,
    sliceFallback: 0,
    sliceMismatch: 0,
    parityChecked: 0,
    parityMismatch: 0
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
    maxRequestsPerMinute,
    maxConcurrency,
    // The crawl is event-loop-bound on linkedom parsing (CPU/mem/rpm all idle), so the
    // default 0.6 event-loop guard pins concurrency at ~3. Relax it a notch so the
    // autoscaler can climb; maxConcurrency default is kept low (10) so this can't burst
    // the F5 listing rate. See #3559 profiling.
    autoscaledPoolOptions: {
      snapshotterOptions: { maxBlockedMillis: 100 },
      systemStatusOptions: { maxEventLoopOverloadedRatio: 0.7 }
    },
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
      // BF → ms-category-box; DETAIL → product-detail / breadcrumb;
      // everything deeper carries breadcrumb.
      if (request.userData.label !== Labels.COUNT) {
        const looksLikeDatart =
          body.includes("product-box-list") ||
          body.includes("subcategory-box-list") ||
          body.includes("category-tree-box-list") ||
          body.includes("microsite-katalog") ||
          body.includes("category-submenu") ||
          body.includes("ms-category-box") ||
          body.includes("product-detail") ||
          body.includes("breadcrumb");
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
      // For deep-pagination pages, parse only the product grid (~8% of the page) — the
      // full-DOM build is the CPU bottleneck. categoryOverride carries the breadcrumb the
      // slice lacks. START/CATEGORY/DETAIL always full-parse.
      let document;
      let categoryOverride;
      if (request.userData.label === Labels.CATEGORY_NEXT && gridSliceEnabled) {
        const gridHtml = extractProductGridHtml(body);
        if (gridHtml) {
          document = parseHTML(`<html><body>${gridHtml}</body></html>`).document;
          categoryOverride = request.userData.category;
          // Canary: shadow-compare matchCodes against a full parse for the first N pages.
          if (sliceCanaryRemaining > 0) {
            sliceCanaryRemaining -= 1;
            const codes = doc =>
              [...doc.querySelectorAll("div.product-box-list div.product-box")]
                .map(b => b.getAttribute("data-product-match"))
                .join(",");
            const fullDoc = parseHTML(body).document;
            if (codes(fullDoc) !== codes(document)) {
              stats.inc("sliceMismatch");
              log.warning(`grid-slice canary mismatch on ${request.url} — disabling slicing for this run`);
              gridSliceEnabled = false;
              document = fullDoc;
              categoryOverride = undefined;
            }
          }
        } else {
          stats.inc("sliceFallback");
          document = parseHTML(body).document;
        }
      } else {
        document = parseHTML(body).document;
      }
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
        // Propagate this category's breadcrumb so the (grid-sliced) CATEGORY_NEXT pages,
        // which have no breadcrumb of their own, still get the `category` field.
        const pageCategories = breadcrumbCategories(document);
        const urls = restPageUrls(lastPagination, i => ({
          url: `${request.url}?page=${i}`,
          userData: {
            label: Labels.CATEGORY_NEXT,
            category: pageCategories
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
        const products = extractItems(document, rootUrl, country, categoryOverride);
        const newProducts = [];
        for (const product of products) {
          if (processedIds[product.itemId]) {
            stats.inc("itemsDuplicity");
            log.debug(`ID ${product.itemId} already saved`);
            continue;
          }
          processedIds[product.itemId] = true;
          newProducts.push(product);
        }

        if (voucherApiEnabled) {
          // Bulk-fetch anonymous vouchers for this page's products, decide each price,
          // push directly, and enqueue detail fetches only for fallbacks + a capped
          // parity sample. The post-run circuit-breaker validates pushes against detail.
          // Bazar (used/open-box) units are a separate product class: not in the voucher
          // campaign, and their detail JSON-LD echoes the NEW price. Price them from the
          // detail page like the legacy flow, and keep them out of voucher-api accounting.
          const isBazar = p => p.itemUrl.includes("/bazar/");
          const withCode = newProducts.filter(p => p.matchCode && !isBazar(p));
          stats.add("voucherRequested", withCode.length);
          const byMatch = new Map();
          for (let i = 0; i < withCode.length; i += VOUCHER_BATCH_SIZE) {
            const chunk = withCode.slice(i, i + VOUCHER_BATCH_SIZE).map(p => p.matchCode);
            try {
              stats.inc("voucherApiCalls");
              const part = await fetchVouchersBatch(chunk, voucherCfg);
              for (const [k, v] of part) byMatch.set(k, v);
            } catch (e) {
              stats.inc("voucherApiFailed");
              log.warning(`voucher api batch failed (${chunk.length} codes): ${e.message}`);
            }
          }
          stats.add("voucherReturned", withCode.filter(p => byMatch.has(p.matchCode)).length);

          const productsToPush = [];
          const fallbackRequests = [];
          const sampleParity = (stratum, expected, url) => {
            if (parityTaken[stratum] < PARITY_PER_STRATUM) {
              parityTaken[stratum] += 1;
              fallbackRequests.push({ url, userData: { label: Labels.DETAIL, parity: { expected, stratum } } });
            }
          };
          for (const product of newProducts) {
            if (isBazar(product)) {
              // Used/open-box unit: no campaign voucher; the listing price IS the anonymous
              // price (its detail JSON-LD echoes the NEW price, so don't trust detail). Push
              // straight from the listing like the pre-detail-phase design did.
              product.currentPrice = product.basePrice;
              product.discounted = product.originalPrice > product.basePrice;
              productsToPush.push(stripInternal(product));
              stats.inc("bazarDirect");
              sampleParity("bazar", product.basePrice, product.itemUrl);
              continue;
            }
            const payload = product.matchCode ? byMatch.get(product.matchCode) : undefined;
            const decision = decidePrice(product, payload);
            if (decision.action === "push") {
              product.currentPrice = decision.currentPrice;
              product.discounted = decision.discounted;
              if (decision.stratum === "coupon") stats.inc("voucherApplied");
              productsToPush.push(stripInternal(product));
              sampleParity(decision.stratum, decision.currentPrice, product.itemUrl);
            } else {
              stats.inc("voucherFallback");
              log.debug(`detail fallback for ${product.matchCode ?? product.itemId}: ${decision.reason}`);
              fallbackRequests.push({ url: product.itemUrl, userData: { label: Labels.DETAIL, product } });
            }
          }
          // One batched dataset write per page (instead of ~22 serial awaits).
          if (productsToPush.length > 0) {
            await Dataset.pushData(productsToPush);
            stats.add("items", productsToPush.length);
          }
          if (fallbackRequests.length > 0) {
            await enqueueNewUrls({ requestQueue: crawler.requestQueue, processedUrls, urls: fallbackRequests, stats });
          }
          log.info(
            `${request.url}: ${newProducts.length} products, ${productsToPush.length} pushed, ${fallbackRequests.length} detail (fallback+parity)`
          );
        } else {
          // Legacy / SK / BF: one detail fetch per product (the detail page
          // server-renders the coupon price; see the DETAIL handler).
          const detailRequests = newProducts.map(product => ({
            url: product.itemUrl,
            userData: { label: Labels.DETAIL, product }
          }));
          if (detailRequests.length > 0) {
            await enqueueNewUrls({ requestQueue: crawler.requestQueue, processedUrls, urls: detailRequests, stats });
          }
          log.info(`${request.url} Found ${products.length} products, enqueued ${detailRequests.length} detail pages`);
        }
      }
      if (request.userData.label === Labels.DETAIL) {
        const couponPrice = detailCouponPrice(document);

        if (request.userData.parity) {
          // Compare-only: the item was already pushed from the listing (voucher API or, for
          // bazar, the listing price). Detail truth = coupon `.price-finally` if present,
          // else the GTM displayed price (NOT JSON-LD — it's wrong on bazar pages). Any
          // divergence beyond rounding is a hard signal the post-run circuit-breaker aborts on.
          stats.inc("parityChecked");
          const { expected, stratum } = request.userData.parity;
          const detailFinal = couponPrice ?? detailDisplayedPrice(document);
          if (detailFinal == null) {
            log.warning(`parity: no detail price for ${request.url}`);
          } else if (Math.abs(detailFinal - expected) > PRICE_TOLERANCE) {
            stats.inc("parityMismatch");
            log.error(`PARITY MISMATCH [${stratum}] ${request.url}: api=${expected} detail=${detailFinal}`);
          }
          return;
        }

        const product = request.userData.product;
        if (couponPrice != null && couponPrice > 0 && couponPrice < product.currentPrice) {
          log.info(`Product ${product.itemId}: coupon price ${couponPrice} (was ${product.currentPrice})`);
          product.currentPrice = couponPrice;
          product.discounted = true;
        }
        await Dataset.pushData(stripInternal(product));
        stats.inc("items");
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

  // Voucher-API price-integrity circuit-breaker. A stale banner_id, schema drift, or a
  // personalized/changed campaign surfaces here as a parity mismatch or low coverage.
  // Wrong daily prices are worse than a failed run, so abort loudly instead of uploading.
  if (voucherApiEnabled) {
    const s = stats.get();
    const requested = s.voucherRequested || 0;
    const coverage = requested > 0 ? (s.voucherReturned || 0) / requested : 1;
    const failRatio = s.voucherApiCalls > 0 ? (s.voucherApiFailed || 0) / s.voucherApiCalls : 0;
    const problems = [];
    // Correctness gate: any price we computed via the API must match the detail page.
    if (s.parityMismatch > 0) problems.push(`${s.parityMismatch}/${s.parityChecked} parity mismatches`);
    // API-health gates. Low coverage just means more (correct) detail fallbacks, so it
    // only HARD-fails when catastrophic (≈ dead banner_id) and WARNs in between —
    // correctness is guarded by parity, not coverage.
    if (failRatio > 0.5) problems.push(`${s.voucherApiFailed}/${s.voucherApiCalls} voucher-api batches failed`);
    if (requested > 0 && coverage < 0.5) problems.push(`voucher-api coverage ${(coverage * 100).toFixed(1)}% < 50% (banner_id stale?)`);
    if (problems.length > 0) {
      throw new Error(`Voucher-API price integrity check FAILED: ${problems.join("; ")}. Aborting before upload to avoid wrong prices.`);
    }
    if (requested > 0 && coverage < 0.98) {
      log.warning(`Voucher-API coverage ${(coverage * 100).toFixed(1)}% < 98% (degraded — more detail fallbacks than usual)`);
    }
    log.info(
      `Voucher-API ok: coverage ${(coverage * 100).toFixed(1)}%, applied ${s.voucherApplied || 0}, fallbacks ${s.voucherFallback || 0}, bazar ${s.bazarDirect || 0}, parityChecked ${s.parityChecked || 0}, parityMismatch ${s.parityMismatch || 0}`
    );
  }

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
