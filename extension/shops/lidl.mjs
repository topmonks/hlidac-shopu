import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Lidl is a Nuxt SPA. If we inject inside #pdp-view before Vue has finished
// hydrating, Vue's diff sees an "extra" node, treats it as a hydration
// mismatch and wipes our widget. Once hydration is complete Vue leaves our
// subtree alone, so we wait for the .detail-one subtree to stop mutating
// before letting AsyncShop kick off rendering.
//
// We deliberately use stability detection rather than a fixed delay so the
// behaviour adapts to slow networks / devices: on a fast machine the area
// settles within ~1s, on slower ones it just naturally takes longer.
const HYDRATION_STABILITY_MS = 500;
const HYDRATION_MAX_WAIT_MS = 15000;

export class Lidl extends AsyncShop {
  get waitForSelector() {
    return ".detail-one .buybox-one .ods-price__value";
  }

  get injectionPoint() {
    return ["beforebegin", ".detail-one .buybox-one"];
  }

  async scheduleRendering(handlers) {
    await waitForHydration(".detail-one");
    return super.scheduleRendering(handlers);
  }

  async scrape() {
    const buybox = document.querySelector(".detail-one .buybox-one");
    if (!buybox) return;
    const itemId = document.querySelector('.detail-one [data-qa-label="erp-number"]')?.textContent;
    const title = document.querySelector(".detail-one [data-qa-label='keyfacts-title']")?.textContent?.trim();
    const currentPrice = cleanPrice(buybox.querySelector(".ods-price__value"));
    const originalPrice = cleanPrice(buybox.querySelector(".ods-price__stroke-price s"));
    const imageUrl = document.querySelector(".media-carousel-slider .media-carousel-item[data-index='0'] .image")?.src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

/**
 * Resolves once `selector`'s subtree has been quiet for HYDRATION_STABILITY_MS,
 * or after HYDRATION_MAX_WAIT_MS as a hard fallback.
 */
function waitForHydration(selector) {
  return new Promise(resolve => {
    const overallStart = Date.now();

    const start = () => {
      const target = document.querySelector(selector);
      if (!target) {
        if (Date.now() - overallStart >= HYDRATION_MAX_WAIT_MS) return resolve();
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
        if (now - overallStart >= HYDRATION_MAX_WAIT_MS) {
          obs.disconnect();
          return resolve();
        }
        if (now - lastMutation >= HYDRATION_STABILITY_MS) {
          obs.disconnect();
          return resolve();
        }
        setTimeout(check, 100);
      };
      setTimeout(check, HYDRATION_STABILITY_MS);
    };

    start();
  });
}

registerShop(new Lidl(), "lidl_cz");
