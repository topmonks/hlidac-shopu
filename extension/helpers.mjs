import { cleanPriceText, cleanUnitPriceText } from "@hlidac-shopu/lib/parse.mjs";
import { shopName, shops as shops_lib } from "@hlidac-shopu/lib/shops.mjs";

/**
 *
 * @param {Element|string} s DOM element or CSS selector of the element
 * @returns {string|null}
 */
export function cleanPrice(s) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  let priceText = el.textContent;
  return cleanPriceText(priceText);
}

/**
 * Check if the price is per unit or per weight
 * @param {Element|string} s DOM element or CSS selector of the element
 * @returns {boolean|null}
 */
export function isUnitPrice(s) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  return el.textContent.includes("/kg");
}

/**
 * Get price for product weight from price per 1 Kg
 * @param {Element|string} s DOM element or CSS selector of the element
 * @param {number} quantity
 * @returns {number|null}
 */
export function cleanUnitPrice(s, quantity) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  let priceText = el.textContent;
  const unitPrice = cleanUnitPriceText(priceText);
  return quantity * (unitPrice / 1000).toFixed(2);
}

export const shops = new Map();

export function registerShop(shop, ...names) {
  for (let name of names) {
    shops.set(name, shop);
  }
}

export function getShop(url) {
  return shops.get(shopName(url));
}

export function getItemIdFromUrl(url) {
  const shop = shops_lib.get(shopName(url));
  // `new URL` normalizes a string, a URL or a `location` - the last of which has `search`
  // but no `searchParams`, so a shop whose parse reads query params would throw on it.
  return shop.parse(new URL(url)).itemId;
}

/**
 * Inspired by https://snipplr.com/view/7215/javascript-dom-element-visibility-checker
 * @param {Element} el
 * @returns {boolean}
 */
export function isElementVisible(el) {
  if (el === document) return true;

  if (!el) return false;
  if (!el.parentNode) return false;
  if (el.style?.display === "none") return false;
  if (el.style?.visibility === "hidden") return false;

  const style = window.getComputedStyle(el, "");
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;

  return isElementVisible(el.parentNode);
}

/**
 * Wait until the subtree of `selector` has had no DOM mutations for `stabilityMs`,
 * with a hard `maxWaitMs` fallback. Resolves with no value either way.
 *
 * Useful for SPA-rendered shops (Vue/Nuxt 3, etc.) where injecting our chart
 * before the framework finishes hydrating causes the framework's diff to treat
 * our injected node as a hydration mismatch and wipe it on the next render
 * pass. Stability detection adapts to slow networks/devices because it
 * observes actual DOM activity instead of using a fixed delay.
 *
 * @param {string} selector
 * @param {{ stabilityMs?: number, maxWaitMs?: number }} [options]
 * @returns {Promise<void>}
 */
export function waitForHydration(selector, { stabilityMs = 500, maxWaitMs = 15000 } = {}) {
  return new Promise(resolve => {
    const overallStart = Date.now();

    const start = () => {
      const target = document.querySelector(selector);
      if (!target) {
        if (Date.now() - overallStart >= maxWaitMs) return resolve();
        setTimeout(start, 50);
        return;
      }

      let lastMutation = Date.now();
      const obs = new MutationObserver(() => {
        lastMutation = Date.now();
      });
      obs.observe(target, { childList: true, subtree: true, attributes: true });

      const check = () => {
        const now = Date.now();
        if (now - overallStart >= maxWaitMs) {
          obs.disconnect();
          return resolve();
        }
        if (now - lastMutation >= stabilityMs) {
          obs.disconnect();
          return resolve();
        }
        setTimeout(check, 100);
      };
      setTimeout(check, stabilityMs);
    };

    start();
  });
}

export {
  cleanPriceText,
  cleanUnitPriceText
} from "@hlidac-shopu/lib/parse.mjs";
