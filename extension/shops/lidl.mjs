import { cleanPrice, registerShop, waitForHydration } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Lidl is a Nuxt SPA. If we inject inside #pdp-view before Vue has finished
// hydrating, Vue's diff sees an "extra" node, treats it as a hydration
// mismatch and wipes our widget. Once hydration is complete Vue leaves our
// subtree alone, so we wait for the .detail-one subtree to stop mutating
// before letting AsyncShop kick off rendering.
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

registerShop(new Lidl(), "lidl_cz");
