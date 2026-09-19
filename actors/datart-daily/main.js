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

/** Strip internal-only fields before pushing a product to the dataset. */
function stripInternal(product) {
  const { matchCode, basePrice, listingDiscountFlag, ...rest } = product;
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
//   3. Apply the weblayer's own arithmetic and gates for an anonymous (not logged-in)
//      shopper.
// ctd-api is Exponea infra, NOT behind datart's F5, so these are plain fetch() calls.
// company_id/executor id are INPUT-configurable because marketing rotates them. Any
// failure degrades to the displayed price (never a guessed price) and is counted.
const EXPONEA_API_URL = "https://ctd-api.datart.cz/campaigns/banners/show";
const DEFAULT_EXPONEA_COMPANY_ID = "aeb32f50-0652-11ec-bb4f-863dd5b8e706";
const DEFAULT_COUPON_EXECUTOR_ID = "6a5f499a24bf7f92446534b6";
const COUPON_BATCH_SIZE = 50;
const PRICE_TOLERANCE = 1; // Kč; executor price vs listing price rounding slack

/**
 * POST one banner request to Exponea and return the concatenated weblayer JS.
 * @param {string} bannerId
 * @param {object} params
 * @param {{companyId: string, cookie: string}} cfg
 */
async function exponeaShow(bannerId, params, { companyId, cookie }) {
  const res = await fetch(EXPONEA_API_URL, {
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
 * From the executor response, map match-code -> the categoryDiscount campaigns
 * covering it (with the executor's per-product payload: price, brand, category, vouchers).
 * @param {string} js
 * @returns {Map<string, {name: string, weblayerId: string, hasFilters: boolean, product: object}[]>}
 */
function parseExecutorCampaigns(js) {
  const byMatch = new Map();
  let sawTree = false;
  const walk = formats => {
    if (!Array.isArray(formats)) return;
    for (const format of formats) {
      if (!format || typeof format !== "object") continue;
      for (const campaign of format.campaigns ?? []) {
        sawTree = true;
        if (campaign?.format !== "categoryDiscount") continue;
        for (const product of campaign.campaignProducts ?? []) {
          if (typeof product?.match !== "string") continue;
          const list = byMatch.get(product.match) ?? [];
          list.push({
            name: campaign.campaign_name,
            weblayerId: campaign.weblayer_id,
            hasFilters: campaign.hasFilters === "True",
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
  return byMatch;
}

/**
 * Read a categoryDiscount weblayer's `this.options = {…}` string settings.
 * Returns null for any other weblayer kind (e.g. CategoryAutoDiscount = vouchers).
 * @param {string} js
 */
function parseDiscountWeblayer(js) {
  const start = js.indexOf("this.options = {");
  if (start === -1) return null;
  const block = js.slice(start, js.indexOf("};", start));
  const opts = {};
  for (const m of block.matchAll(/(\w+):\s*["']([^"'\n]*)["']/g)) opts[m[1]] ??= m[2];
  if (opts.nameSpace !== "CategoryDiscount") return null;
  const value = Math.abs(Number.parseInt(opts.discountPrice, 10));
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
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
 * Coupon price a not-logged-in shopper sees for one campaign, or null if the
 * weblayer would not show its banner to them. Mirrors the weblayer's init/showBanner.
 * @param {ReturnType<typeof parseDiscountWeblayer>} wl
 * @param {{hasFilters: boolean, product: object}} campaign
 */
function weblayerCouponPrice(wl, { hasFilters, product }) {
  // Anonymous shopper = loginUserType "other": only NO-VIP / VIP-and-NO-VIP campaigns.
  if (wl.targetGroup !== "NO-VIP" && wl.targetGroup !== "VIP and NO-VIP") return null;
  if (!hasFilters && !wl.filterCategory && !wl.whiteListBrand && !wl.blackListBrand && !wl.filterPrice) return null;
  if (wl.filterCategory && !weblayerCategoryMatches(product.category, wl.breadcrumbFilter)) return null;
  const price = Number.parseInt(product.price, 10);
  if (!Number.isFinite(price) || price <= 0) return null;
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
 * The "AutomatickaSleva" auto-discount: the executor's per-product `vouchers`
 * (voucher_group "other", voucher_type 2 = fixed Kč off). Null when none applies.
 */
function autoVoucherPrice(product) {
  const vouchers = Array.isArray(product.vouchers) ? product.vouchers : [];
  const other = vouchers.filter(v => v?.voucher_group === "other" && Number(v.voucher_type) === 2);
  if (other.length !== 1) return null;
  const price = Number.parseInt(product.price, 10);
  const value = Number.parseInt(other[0].voucher_value, 10);
  if (!Number.isFinite(price) || !Number.isFinite(value) || value <= 0 || value >= price) return null;
  return price - value;
}

/**
 * Per-run coupon pricer. `priceProducts` sets currentPrice/discounted on each listing
 * product: the lowest applicable coupon price, else the displayed listing price.
 */
function createCouponPricer({ companyId, executorId, stats }) {
  const cfg = { companyId, cookie: randomUUID() };
  /** @type {Map<string, Promise<ReturnType<typeof parseDiscountWeblayer>>>} */
  const weblayers = new Map();

  function weblayer(id) {
    if (!weblayers.has(id)) {
      const p = exponeaShow(id, {}, cfg).then(parseDiscountWeblayer);
      // Don't cache a failure forever — let a later page retry it.
      p.catch(() => weblayers.delete(id));
      weblayers.set(id, p);
    }
    return weblayers.get(id);
  }

  async function campaignsFor(matchCodes) {
    const byMatch = new Map();
    for (let i = 0; i < matchCodes.length; i += COUPON_BATCH_SIZE) {
      const chunk = matchCodes.slice(i, i + COUPON_BATCH_SIZE);
      try {
        stats.inc("couponApiCalls");
        const part = parseExecutorCampaigns(await exponeaShow(executorId, { productIds: chunk }, cfg));
        for (const [k, v] of part) byMatch.set(k, v);
      } catch (e) {
        stats.inc("couponApiFailed");
        log.warning(`coupon executor batch failed (${chunk.length} codes): ${e.message}`);
      }
    }
    return byMatch;
  }

  return async function priceProducts(products) {
    for (const product of products) {
      product.currentPrice = product.basePrice;
      product.discounted = product.originalPrice > product.basePrice;
    }
    const withCode = products.filter(p => p.matchCode);
    if (withCode.length === 0) return;
    const byMatch = await campaignsFor(withCode.map(p => p.matchCode));

    for (const product of withCode) {
      const campaigns = byMatch.get(product.matchCode);
      if (!campaigns) continue;
      let best = null;
      for (const campaign of campaigns) {
        // Only trust the executor's price when it agrees with the listing we scraped.
        if (Math.abs(Number(campaign.product.price) - product.basePrice) > PRICE_TOLERANCE) {
          stats.inc("couponPriceMismatch");
          continue;
        }
        let price = autoVoucherPrice(campaign.product);
        try {
          const wl = await weblayer(campaign.weblayerId);
          if (wl) {
            const couponPrice = weblayerCouponPrice(wl, campaign);
            if (couponPrice != null && (price == null || couponPrice < price)) price = couponPrice;
          }
        } catch (e) {
          stats.inc("couponWeblayerFailed");
          log.warning(`coupon weblayer ${campaign.weblayerId} (${campaign.name}) failed: ${e.message}`);
        }
        if (price != null && (best == null || price < best)) best = price;
      }
      if (best != null && best < product.basePrice) {
        product.currentPrice = best;
        product.discounted = true;
        stats.inc("couponApplied");
      }
    }
  };
}

/** Coupon price from the detail page (server-rendered `.price-finally`), or null. */
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
    couponExecutorId = DEFAULT_COUPON_EXECUTOR_ID,
    // Throughput knobs (configurable so they can be tuned without a redeploy). The
    // legacy detail-per-SKU design had to keep these low because every extra request
    // burned an F5 session; with CZ detail fetches gone the listing crawl runs much faster.
    maxRequestsPerMinute = 200,
    maxConcurrency = 10
  } = await getInput();

  // CZ Full/Test price straight from the category page plus the Exponea coupon lookup (no
  // detail fetch). SK/BF keep the legacy per-product detail flow until separately verified.
  const czListingPricing = country === Country.CZ && (type === ActorType.Full || type === ActorType.Test);

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
    couponWeblayerFailed: 0,
    couponPriceMismatch: 0,
    couponApplied: 0
  });
  const priceProducts = createCouponPricer({ companyId: exponeaCompanyId, executorId: couponExecutorId, stats });

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
