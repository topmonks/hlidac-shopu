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
  const ctx = await launchCloakBrowser();
  try {
    const page = await ctx.newPage();
    const cookies = await waitForF5Session(ctx, page, rootUrl);
    log.info(`Solver: F5 session solved (${Object.keys(cookies).length} cookies, TSPD+BIGipServer present)`);
    return cookies;
  } finally {
    await ctx.close();
  }
}

function launchCloakBrowser() {
  return launchCloakContext({
    headless: true,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    locale: "cs-CZ",
    timezoneId: "Europe/Prague"
  });
}

/**
 * Open the catalog in `page` and poll until F5 has issued its TSPD + BIGipServer
 * session cookies; returns the cookie jar. The browser context keeps the session.
 */
async function waitForF5Session(ctx, page, rootUrl) {
  await page.goto(`${rootUrl}/katalog`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const jar = await ctx.cookies(rootUrl);
    const hasTspd = jar.some(c => c.name.startsWith("TS"));
    const hasBigIp = jar.some(c => c.name.startsWith("BIGipServer"));
    if (hasTspd && hasBigIp) return Object.fromEntries(jar.map(c => [c.name, c.value]));
    await page.waitForTimeout(1000);
  }
  throw new Error("Solver: timed out waiting for TSPD cookie from F5");
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

/** Strip internal-only fields before pushing a product to the dataset. */
function stripInternal(product) {
  const { matchCode, basePrice, ...rest } = product;
  return rest;
}

// ---------------------------------------------------------------------------
// CZ coupon price ("Cena s kódem") via Bloomreach/Exponea
// ---------------------------------------------------------------------------
// Datart's coupon campaigns (e.g. "Dny Marianne −50 %, Cena s kódem 599 Kč") are not
// in the server HTML: a Bloomreach weblayer renders them client-side. We treat the
// coupon price as the current price (a regular discount, like Notino/Alza — see #3606),
// so we reproduce what the listing page does in the browser:
//   1. POST the page's match-codes to the listing "executor" banner; it answers, per
//      campaign, which products the campaign covers (campaignProducts).
//   2. For every `categoryDiscount` campaign covering a product, fetch that campaign's
//      weblayer once per run and read its options (discount %, or Kč, and filters).
//   3. Apply the weblayer's arithmetic and gates for an anonymous (not logged-in)
//      shopper to the LISTING price. Exponea's own catalog `price` can lag the price
//      datart actually charges; the product-page banner and the checkout both apply
//      the code to the real price, so the executor is used only for membership/filters.
// ctd-api is Exponea infra, NOT behind datart's F5, so these are plain fetch() calls.
// company_id/executor id are INPUT-configurable because marketing rotates them.
// Anything unexpected (failed calls, an unknown weblayer template, a new price-like
// campaign format) is counted, and `couponHealthProblems` + the end-of-run browser
// canary turn it into a FAILED run instead of silently recording displayed prices.
const EXPONEA_API_URL = "https://ctd-api.datart.cz/campaigns/banners/show";
const DEFAULT_EXPONEA_COMPANY_ID = "aeb32f50-0652-11ec-bb4f-863dd5b8e706";
const DEFAULT_COUPON_EXECUTOR_ID = "6a5f499a24bf7f92446534b6";
const COUPON_BATCH_SIZE = 50;
const COUPON_MAX_FAILURE_RATIO = 0.02;
const EXPONEA_TIMEOUT_MS = 8000;
const EXPONEA_ATTEMPTS = 2;
// Campaign formats the executor's own code handles. The two discount formats carry
// coupon prices; the rest are flags/installments/banners that never change the price.
const PRICE_CAMPAIGN_FORMATS = new Set(["categoryDiscount", "categoryAutoDiscount"]);
const KNOWN_CAMPAIGN_FORMATS = new Set([
  ...PRICE_CAMPAIGN_FORMATS,
  "categoryCashBack",
  "categoryClassicInstallments",
  "categoryDetail",
  "categoryFlag",
  "categoryGift",
  "categoryInstallments",
  "categoryOtherInstallments",
  "categoryServicePromo",
  "categoryThirds"
]);
const PRICE_LIKE_FORMAT = /discount|price|sale|voucher|coupon|sleva|cena/i;

/**
 * POST one banner request to Exponea and return the concatenated weblayer JS.
 * @param {string} bannerId
 * @param {object} params
 * @param {{companyId: string, cookie: string}} cfg
 */
async function exponeaShow(bannerId, params, cfg) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await exponeaShowOnce(bannerId, params, cfg);
    } catch (e) {
      if (attempt >= EXPONEA_ATTEMPTS) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function exponeaShowOnce(bannerId, params, { companyId, cookie }) {
  const res = await fetch(EXPONEA_API_URL, {
    signal: AbortSignal.timeout(EXPONEA_TIMEOUT_MS),
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
      params,
      initiator: "manual"
    })
  });
  if (!res.ok) throw new Error(`exponea: HTTP ${res.status}`);
  let outer;
  try {
    outer = JSON.parse(await res.text());
  } catch {
    throw new Error("exponea: response is not JSON");
  }
  if (outer.success !== true) throw new Error("exponea: response success !== true");
  return Array.isArray(outer.data) ? outer.data.join("\n") : "";
}

/**
 * Parse every `JSON.parse('…')` literal embedded in weblayer JS, WITHOUT eval.
 * @param {string} js
 * @returns {unknown[]}
 */
function jsonParseLiterals(js) {
  const marker = "JSON.parse('";
  const out = [];
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
    try {
      out.push(JSON.parse(js.slice(from, end).replace(/\\'/g, "'")));
    } catch {
      // not every JSON.parse literal is the campaign tree
    }
  }
  return out;
}

/**
 * From the executor response, map match-code -> the price campaigns covering it, in
 * the executor's tree order (with the per-product payload: price, brand, category,
 * vouchers), plus every match-code the tree mentions at all and unknown formats.
 * Each campaign carries its format group and that group's `maxWebleyers`: datart's
 * executor renders a group's campaigns one after another and skips products that
 * already got `maxWebleyers` banners from that group, so ORDER decides the price.
 * @param {string} js
 */
function parseExecutorCampaigns(js) {
  /** @type {Map<string, {name: string, weblayerId: string, hasFilters: boolean, group: number, maxWebleyers: number, product: object}[]>} */
  const byMatch = new Map();
  const covered = new Set();
  const unknownFormats = new Set();
  let sawTree = false;
  let groups = 0;
  const walk = formats => {
    if (!Array.isArray(formats)) return;
    for (const format of formats) {
      if (!format || typeof format !== "object") continue;
      const group = groups++;
      const maxWebleyers = Math.max(1, Number.parseInt(format.maxWebleyers, 10) || 1);
      for (const campaign of format.campaigns ?? []) {
        sawTree = true;
        if (!KNOWN_CAMPAIGN_FORMATS.has(campaign?.format)) unknownFormats.add(String(campaign?.format));
        for (const product of campaign?.campaignProducts ?? []) {
          if (typeof product?.match !== "string") continue;
          covered.add(product.match);
          if (!PRICE_CAMPAIGN_FORMATS.has(campaign.format)) continue;
          const list = byMatch.get(product.match) ?? [];
          list.push({
            name: campaign.campaign_name,
            weblayerId: campaign.weblayer_id,
            hasFilters: campaign.hasFilters === "True",
            group,
            maxWebleyers,
            product
          });
          byMatch.set(product.match, list);
        }
      }
      walk(format.nextFormats);
    }
  };
  for (const literal of jsonParseLiterals(js)) walk(literal);
  if (!sawTree) throw new Error("exponea executor: no campaign tree in response");
  return { byMatch, covered, unknownFormats };
}

/**
 * Read a categoryDiscount weblayer's `this.options = {…}` settings.
 * Returns `{kind: "auto"}` for the voucher-based CategoryAutoDiscount template,
 * `{kind: "discount", …}` for a CategoryDiscount coupon, or null for a template we
 * don't understand (the caller treats that as a health failure).
 * @param {string} js
 */
function parseDiscountWeblayer(js) {
  const start = js.indexOf("this.options = {");
  if (start === -1) return null;
  const block = js.slice(start, js.indexOf("};", start));
  const opts = {};
  for (const m of block.matchAll(/(\w+):\s*(?:"([^"\n]*)"|'([^'\n]*)')/g)) opts[m[1]] ??= m[2] ?? m[3];
  if (opts.nameSpace === "CategoryAutoDiscount") return { kind: "auto" };
  if (opts.nameSpace !== "CategoryDiscount") return null;
  const value = Math.abs(Number.parseInt(opts.discountPrice, 10));
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    kind: "discount",
    percentage: opts.discountType === "Procentuální",
    value,
    targetGroup: opts.targetGroup,
    filterCategory: opts.filterCategory === "Zapnuto",
    breadcrumbFilter: opts.breadcrumbFilter ?? "",
    whiteListBrand: opts.filterBrand === "Zapnuto / Povolené značky",
    blackListBrand: opts.filterBrand === "Zapnuto / Zakázané značky",
    brandsOfProduct: opts.brandsOfProduct ?? "",
    filterPrice: opts.filterPrice === "Zapnuto",
    priceFrom: Number.parseInt(opts.priceFrom, 10),
    priceTo: Number.parseInt(opts.priceTo, 10)
  };
}

/** Weblayer `isCategory`: note the result is decided by the LAST breadcrumb segment only. */
function weblayerCategoryMatches(category, breadcrumbFilter) {
  const pageCategory = String(category ?? "").split("/");
  for (const source of breadcrumbFilter.split(";")) {
    const parts = source.split(" > ");
    const last = parts.length - 1;
    if (parts[last] === pageCategory[last]) return true;
  }
  return false;
}

/**
 * Coupon price a not-logged-in shopper gets from one campaign, or null if the
 * weblayer would not offer it to them. Mirrors the weblayer's init/showBanner gates.
 * @param {object} wl  parseDiscountWeblayer result of kind "discount"
 * @param {{hasFilters: boolean, product: object}} campaign
 * @param {number} price  the listing price the shopper pays without the code
 */
function weblayerCouponPrice(wl, { hasFilters, product }, price) {
  // Anonymous shopper = loginUserType "other": only NO-VIP / VIP-and-NO-VIP campaigns.
  if (wl.targetGroup !== "NO-VIP" && wl.targetGroup !== "VIP and NO-VIP") return null;
  if (!hasFilters && !wl.filterCategory && !wl.whiteListBrand && !wl.blackListBrand && !wl.filterPrice) return null;
  if (wl.filterCategory && !weblayerCategoryMatches(product.category, wl.breadcrumbFilter)) return null;
  if (wl.whiteListBrand || wl.blackListBrand) {
    const brands = wl.brandsOfProduct.split(";").flatMap(b => [b, b.toLowerCase().replace("'", "")]);
    const isBrand = brands.includes(String(product.brand ?? "").toLowerCase());
    if (wl.whiteListBrand ? !isBrand : isBrand) return null;
  }
  if (wl.filterPrice && !(price >= wl.priceFrom && price <= wl.priceTo)) return null;
  const couponPrice = wl.percentage
    ? price - Number((price * (wl.value / 100)).toFixed(0))
    : Math.ceil(price - wl.value);
  return couponPrice > 0 && couponPrice < price ? couponPrice : null;
}

/**
 * The "AutomatickaSleva" auto-discount (CategoryAutoDiscount weblayer): mirrors its
 * getProductVoucher/calculateVoucherDiscount for an anonymous shopper — the FIRST
 * voucher of group "other" with a positive value, subtracted as whole Kč. The
 * weblayer skips products the executor has no price for. Null when none applies.
 */
function autoVoucherPrice(product, price) {
  if (product.price == null) return null;
  const vouchers = Array.isArray(product.vouchers) ? product.vouchers : [];
  const voucher = vouchers.find(v => v?.voucher_group === "other" && Number(v.voucher_value) > 0);
  if (!voucher) return null;
  const couponPrice = Math.round(price - Math.round(Number.parseFloat(voucher.voucher_value)));
  return couponPrice > 0 && couponPrice < price ? couponPrice : null;
}

/**
 * Per-run coupon pricer. `priceProducts` sets currentPrice/discounted on each listing
 * product: the lowest applicable coupon price, else the displayed listing price.
 */
function createCouponPricer({ companyId, executorId, stats }) {
  const cfg = { companyId, cookie: randomUUID() };
  /** @type {Map<string, Promise<ReturnType<typeof parseDiscountWeblayer>>>} */
  const weblayers = new Map();
  const reportedUnknown = new Set();

  function weblayer(id) {
    if (!weblayers.has(id)) {
      const p = exponeaShow(id, {}, cfg).then(parseDiscountWeblayer);
      // Don't cache a failure forever — let a later page retry it.
      p.catch(() => weblayers.delete(id));
      weblayers.set(id, p);
    }
    return weblayers.get(id);
  }

  function reportOnce(key, message) {
    if (reportedUnknown.has(key)) return;
    reportedUnknown.add(key);
    log.error(message);
  }

  async function campaignsFor(matchCodes) {
    const byMatch = new Map();
    const covered = new Set();
    for (let i = 0; i < matchCodes.length; i += COUPON_BATCH_SIZE) {
      const chunk = matchCodes.slice(i, i + COUPON_BATCH_SIZE);
      try {
        stats.inc("couponApiCalls");
        const part = parseExecutorCampaigns(await exponeaShow(executorId, { productIds: chunk }, cfg));
        for (const [k, v] of part.byMatch) byMatch.set(k, v);
        for (const k of part.covered) covered.add(k);
        for (const format of part.unknownFormats) {
          if (!PRICE_LIKE_FORMAT.test(format)) continue;
          stats.inc("couponFormatUnknown");
          reportOnce(`format:${format}`, `coupon: unknown price-like campaign format "${format}"`);
        }
      } catch (e) {
        stats.inc("couponApiFailed");
        log.warning(`coupon executor batch failed (${chunk.length} codes): ${e.message}`);
      }
    }
    return { byMatch, covered };
  }

  /** The price one campaign would show this product, or null if it shows none. */
  function campaignPrice(wl, campaign, product) {
    if (wl?.kind === "auto") return autoVoucherPrice(campaign.product, product.basePrice);
    if (wl?.kind === "discount") return weblayerCouponPrice(wl, campaign, product.basePrice);
    stats.inc("couponWeblayerUnknown");
    reportOnce(
      `wl:${campaign.weblayerId}`,
      `coupon: unrecognized discount weblayer ${campaign.weblayerId} (${campaign.name})`
    );
    return null;
  }

  return async function priceProducts(products) {
    for (const product of products) {
      product.currentPrice = product.basePrice;
      product.discounted = product.originalPrice > product.basePrice;
    }
    const priced = products.filter(p => p.basePrice > 0);
    const withCode = priced.filter(p => p.matchCode);
    stats.add("couponPriced", priced.length);
    stats.add("couponNoMatchCode", priced.length - withCode.length);
    if (withCode.length === 0) return;
    const { byMatch, covered } = await campaignsFor(withCode.map(p => p.matchCode));
    stats.add("couponCovered", withCode.filter(p => covered.has(p.matchCode)).length);

    // Resolve every weblayer this page needs in parallel (cached per run).
    const ids = new Set();
    for (const p of withCode) for (const c of byMatch.get(p.matchCode) ?? []) ids.add(c.weblayerId);
    const resolved = new Map();
    await Promise.all(
      [...ids].map(async id => {
        try {
          resolved.set(id, await weblayer(id));
        } catch (e) {
          stats.inc("couponWeblayerFailed");
          log.warning(`coupon weblayer ${id} failed: ${e.message}`);
        }
      })
    );
    stats.add("couponWeblayerLookups", ids.size);

    for (const product of withCode) {
      // Per format group, the page shows the first `maxWebleyers` campaigns (in tree
      // order) that yield a price; with several visible the shopper can use the best.
      const shownByGroup = new Map();
      for (const campaign of byMatch.get(product.matchCode) ?? []) {
        if (!resolved.has(campaign.weblayerId)) continue;
        const shown = shownByGroup.get(campaign.group) ?? [];
        if (shown.length >= campaign.maxWebleyers) continue;
        const price = campaignPrice(resolved.get(campaign.weblayerId), campaign, product);
        if (price == null) continue;
        shown.push(price);
        shownByGroup.set(campaign.group, shown);
      }
      const shownPrices = [...shownByGroup.values()].flat();
      const best = shownPrices.length > 0 ? Math.min(...shownPrices) : null;
      if (best != null && best < product.basePrice) {
        product.currentPrice = best;
        product.discounted = true;
        stats.inc("couponApplied");
      }
    }
  };
}

/**
 * Coupon-pipeline health problems for this run (empty = healthy).
 * @param {Record<string, number>} s  stats snapshot
 * @param {number} sampled  number of products the canary tried to verify
 */
function couponHealthProblems(s, sampled) {
  const problems = [];
  const withCode = s.couponPriced - s.couponNoMatchCode;
  if (s.couponPriced > 0 && s.couponApiCalls === 0) problems.push("the coupon executor was never called");
  if (s.couponPriced > 0 && s.couponNoMatchCode / s.couponPriced > COUPON_MAX_UNCOVERED_RATIO) {
    problems.push(`${s.couponNoMatchCode}/${s.couponPriced} listing products have no data-product-match code`);
  }
  if (withCode >= COUPON_COVERAGE_MIN_PRODUCTS && s.couponCovered / withCode < 1 - COUPON_MAX_UNCOVERED_RATIO) {
    problems.push(`the executor knew only ${s.couponCovered}/${withCode} products — banner id rotated?`);
  }
  if (s.couponApiCalls > 0 && s.couponApiFailed / s.couponApiCalls > COUPON_MAX_FAILURE_RATIO) {
    problems.push(`${s.couponApiFailed}/${s.couponApiCalls} coupon executor calls failed`);
  }
  if (s.couponWeblayerLookups > 0 && s.couponWeblayerFailed / s.couponWeblayerLookups > COUPON_MAX_FAILURE_RATIO) {
    problems.push(`${s.couponWeblayerFailed}/${s.couponWeblayerLookups} coupon weblayer lookups failed`);
  }
  if (s.couponWeblayerUnknown > 0) problems.push(`${s.couponWeblayerUnknown} lookups hit an unrecognized weblayer`);
  if (s.couponFormatUnknown > 0)
    problems.push(`${s.couponFormatUnknown} executor calls saw an unknown price-like format`);
  if (s.couponCanaryMismatch > 0) problems.push(`${s.couponCanaryMismatch} canary products disagree with datart.cz`);
  if (s.couponCanaryUnreadable > Math.max(2, sampled * 0.2)) {
    problems.push(`${s.couponCanaryUnreadable}/${sampled} canary product pages could not be read`);
  }
  if (sampled > 0 && s.couponCanaryChecked === 0 && s.couponCanaryMoved < sampled) {
    problems.push("the canary could not verify a single product");
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Coupon canary: render a sample of product pages the way a shopper sees them
// ---------------------------------------------------------------------------
// The only ground truth for the coupon price is the banner datart's page renders in a
// real browser. After the crawl we open a random sample of products we priced — with
// and without a coupon — in cloakbrowser and compare. A disagreement (e.g. datart
// reworked its campaigns and we stopped seeing coupons) fails the run.
const COUPON_CANARY_PER_STRATUM = 15;
const COUPON_CANARY_MAX_WAIT_MS = 15000;
const COUPON_CANARY_SETTLE_MS = 3000;
const COUPON_CANARY_DEADLINE_MS = 10 * 60 * 1000;
const COUPON_MAX_UNCOVERED_RATIO = 0.05;
const COUPON_COVERAGE_MIN_PRODUCTS = 100;

/** Fixed-size uniform random samples of priced products, split by coupon/no coupon. */
function createCanarySample() {
  const strata = { coupon: { seen: 0, items: [] }, plain: { seen: 0, items: [] } };
  return {
    add(product, hasCoupon) {
      const stratum = hasCoupon ? strata.coupon : strata.plain;
      stratum.seen += 1;
      const entry = { url: product.itemUrl, basePrice: product.basePrice, currentPrice: product.currentPrice };
      if (stratum.items.length < COUPON_CANARY_PER_STRATUM) stratum.items.push(entry);
      else {
        const j = Math.floor(Math.random() * stratum.seen);
        if (j < COUPON_CANARY_PER_STRATUM) stratum.items[j] = entry;
      }
    },
    items: () => [...strata.coupon.items, ...strata.plain.items]
  };
}

/** page.goto that tolerates one in-page redirect/reload (e.g. an F5 challenge round). */
async function gotoSettled(page, url) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
      if (page.url().split("#")[0] === url) return;
      if (attempt >= 3) throw new Error(`landed on ${page.url()}`);
    } catch (e) {
      if (attempt >= 3 || !/interrupted by another navigation/.test(e.message)) throw e;
      await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
    }
  }
}

/**
 * Open each sampled product page in cloakbrowser and compare what datart shows an
 * anonymous shopper (coupon banner price, else the displayed price) to what we recorded.
 * @param {{url: string, basePrice: number, currentPrice: number}[]} items
 */
async function runCouponCanary(items, stats) {
  if (items.length === 0) return;
  log.info(`Coupon canary: verifying ${items.length} products in a browser…`);
  const ctx = await launchCloakBrowser();
  try {
    const page = await ctx.newPage();
    // Earn an F5 session first; without it the first product page runs F5's challenge,
    // whose reload hijacks the next navigations ("interrupted by another navigation").
    await waitForF5Session(ctx, page, rootCZ);
    await page.waitForLoadState("load").catch(() => {});
    const deadline = Date.now() + COUPON_CANARY_DEADLINE_MS;
    for (const item of items) {
      if (Date.now() > deadline) {
        stats.inc("couponCanaryUnreadable");
        continue;
      }
      try {
        await gotoSettled(page, item.url);
        const seen = await page.evaluate(
          async ({ maxWaitMs, settleMs }) => {
            const start = Date.now();
            let weblayerSeenAt = null;
            const parse = t => Number.parseInt(String(t ?? "").replace(/[^\d]/g, ""), 10);
            while (Date.now() - start < maxWaitMs) {
              const displayed = parse(document.querySelector(".product-detail .product-price")?.dataset.priceValue);
              const coupon = parse(
                document.querySelector(".exponea-product-discount #unique-price-after-sale")?.textContent
              );
              if (Number.isFinite(displayed) && Number.isFinite(coupon)) return { displayed, coupon };
              if (weblayerSeenAt === null && document.querySelector("[data-weblayer-id]")) weblayerSeenAt = Date.now();
              if (Number.isFinite(displayed) && weblayerSeenAt !== null && Date.now() - weblayerSeenAt > settleMs) {
                return { displayed, coupon: null };
              }
              await new Promise(r => setTimeout(r, 200));
            }
            return null;
          },
          { maxWaitMs: COUPON_CANARY_MAX_WAIT_MS, settleMs: COUPON_CANARY_SETTLE_MS }
        );
        if (!seen) {
          stats.inc("couponCanaryUnreadable");
          log.warning(`Coupon canary: could not read prices on ${item.url}`);
          continue;
        }
        if (seen.displayed !== item.basePrice) {
          stats.inc("couponCanaryMoved");
          log.info(`Coupon canary: price moved since crawl on ${item.url} (${item.basePrice} → ${seen.displayed})`);
          continue;
        }
        const expected = seen.coupon != null && seen.coupon < seen.displayed ? seen.coupon : seen.displayed;
        stats.inc("couponCanaryChecked");
        if (Math.abs(expected - item.currentPrice) > 1) {
          stats.inc("couponCanaryMismatch");
          log.error(`Coupon canary MISMATCH ${item.url}: recorded ${item.currentPrice}, datart shows ${expected}`);
        }
      } catch (e) {
        stats.inc("couponCanaryUnreadable");
        log.warning(`Coupon canary: ${item.url} failed: ${e.message}`);
      }
    }
  } finally {
    await ctx.close();
  }
}

/**
 * Coupon price from the detail page (server-rendered `.price-finally`), or null.
 * Legacy SK detail flow only — datart.cz no longer renders `.price-finally` (CZ prices
 * coupons via Exponea above), and datart.sk now redirects to nay.sk.
 */
function detailCouponPrice(document) {
  const el = document.querySelector(".product-price-discount.discount-price-box .price-finally");
  if (!el) return null;
  const v = parseFloat(
    el.innerText
      .trim()
      .replace(/[^\d,]+/g, "")
      .replace(",", ".")
  );
  return Number.isFinite(v) ? v : null;
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
      // EU Omnibus "Nejnižší cena za posledních 30 dní" reference. Datart renders it in a
      // `span.cut-price` wrapper whose inner modifier varies by discount type
      // (`--strike`, `--lessOrEqual` on coupon products, …) — match any variant, like the
      // extension does. An empty wrapper means no reference price.
      const lowestPriceInLastMonthEl = productBoxBuyInfoCart.querySelector(
        "div.item-price span.cut-price [class*='cut-price--']"
      );
      if (lowestPriceInLastMonthEl) {
        // Remove sr-only content first to avoid extracting digits from screen reader text
        const srOnly = lowestPriceInLastMonthEl.querySelector(".sr-only");
        const priceText = srOnly
          ? lowestPriceInLastMonthEl.innerText.replace(srOnly.innerText, "").trim()
          : lowestPriceInLastMonthEl.innerText.trim();

        const reference = parseFloat(priceText.replace(/[^\d,]+/g, "").replace(",", "."));
        if (Number.isFinite(reference) && reference > 0) lowestPriceInLastMonth = reference;
      }
      result.originalPrice = lowestPriceInLastMonth;
      // CZ: currentPrice (incl. coupons) is set by the Exponea coupon pricer from basePrice.
      // (Listing "extra sleva"/"sleva X %" flags are Exponea campaign flags, not prices.)
      result.currentPrice = currentPrice;
      result.discounted = lowestPriceInLastMonth > currentPrice;
      // Internal-only (stripped before push): the raw listing price the shopper pays
      // without a code.
      result.basePrice = currentPrice;

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
    couponExecutorId = DEFAULT_COUPON_EXECUTOR_ID,
    // Throughput knobs (configurable so they can be tuned without a redeploy). The
    // legacy detail-per-SKU design had to keep these low because every extra request
    // burned an F5 session; with CZ detail fetches gone the listing crawl runs much faster.
    maxRequestsPerMinute = 200,
    maxConcurrency = 10
  } = await getInput();

  // CZ prices straight from the category page plus the Exponea coupon lookup (no detail
  // fetch) for every run type: Full/Test and Black Friday alike (BF hub pages link to
  // ordinary product listings). The coupon price is no longer in the CZ detail HTML, so the
  // legacy detail flow below only serves SK.
  const czListingPricing = country === Country.CZ;

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
    sliceFallback: 0,
    sliceMismatch: 0,
    // CZ coupon lookup (Exponea): coverage + health counters.
    couponApiCalls: 0,
    couponApiFailed: 0,
    couponPriced: 0,
    couponNoMatchCode: 0,
    couponCovered: 0,
    couponWeblayerLookups: 0,
    couponWeblayerFailed: 0,
    couponWeblayerUnknown: 0,
    couponFormatUnknown: 0,
    couponApplied: 0,
    couponCanaryChecked: 0,
    couponCanaryMismatch: 0,
    couponCanaryMoved: 0,
    couponCanaryUnreadable: 0
  });
  const priceProducts = createCouponPricer({ companyId: exponeaCompanyId, executorId: couponExecutorId, stats });
  const canarySample = createCanarySample();

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

        if (czListingPricing) {
          // currentPrice = the coupon ("Cena s kódem") price when a campaign covers the
          // product, else the displayed listing price (`.actual` / `data-price-value`).
          // Coupon prices count as a regular discount (#3606), same as the extension chart.
          await priceProducts(newProducts);
          for (const product of newProducts) canarySample.add(product, product.currentPrice < product.basePrice);
          if (newProducts.length > 0) {
            await Dataset.pushData(newProducts.map(stripInternal));
            stats.add("items", newProducts.length);
          }
          log.info(`${request.url}: ${products.length} products, ${newProducts.length} pushed`);
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
  // Coupon health verdict for CZ runs; enforced after the upload so a failure never
  // throws away the day's data.
  let couponProblems = [];
  if (czListingPricing) {
    const sample = canarySample.items();
    let canaryError = null;
    try {
      await runCouponCanary(sample, stats);
    } catch (e) {
      // e.g. Chromium failing to launch at the end of a long crawl — still upload.
      canaryError = `the canary could not run: ${e.message}`;
      log.error(canaryError);
    }
    couponProblems = couponHealthProblems(stats.get(), sample.length);
    if (canaryError) couponProblems.push(canaryError);
  }
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

  if (couponProblems.length > 0) {
    throw new Error(
      `Coupon pricing is unhealthy — datart may have changed its campaigns: ${couponProblems.join("; ")}`
    );
  }
  log.info("Finished.");
}

await Actor.main(main, { statusMessage: "DONE" });
