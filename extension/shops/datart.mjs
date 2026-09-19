import { cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

const COUPON_MAX_WAIT_MS = 8000;
// The discount banner needs a further Exponea round trip after the first weblayers
// render (executor → campaign weblayer), so allow a generous settle.
const COUPON_SETTLE_MS = 3000;

/**
 * Coupon price ("Cena s kódem") of datart's Bloomreach/Exponea discount banner, or null.
 * The banner is rendered client-side after page load, so poll for it. Exponea renders
 * other weblayers on every product page; once one of those is present and the discount
 * banner still hasn't shown up after a short settle, there is no coupon. Logged-in
 * VIP/employee shoppers get a personalized base price, so we never read it for them.
 * @returns {Promise<number|null>}
 */
async function exponeaCouponPrice() {
  if (document.querySelector(".ufo-icon__ico-uzivatel-vip, .ufo-icon__ico-uzivatel-hpt")) return null;
  const start = Date.now();
  let weblayerSeenAt = null;
  while (Date.now() - start < COUPON_MAX_WAIT_MS) {
    const text = document.querySelector(".exponea-product-discount #unique-price-after-sale")?.textContent;
    const price = text ? cleanPriceText(text) : null;
    if (price) return Number(price);
    if (weblayerSeenAt === null && document.querySelector("[data-weblayer-id]")) weblayerSeenAt = Date.now();
    if (weblayerSeenAt !== null && Date.now() - weblayerSeenAt > COUPON_SETTLE_MS) return null;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

export class Datart extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemIdTarget = elem.querySelector(".btn.btn-link.btn-compare").id;
    if (!itemIdTarget.length) return;

    const itemId = itemIdTarget.split("-").at(-1);

    const title = elem.querySelector("h1.product-detail-title").textContent.trim();
    // Coupon ("Cena s kódem") price counts as the current price (#3606), same as the
    // datart-daily actor; otherwise the displayed price.
    const displayedPrice = Number(elem.querySelector(".product-price").dataset.priceValue);
    const couponPrice = await exponeaCouponPrice();
    const currentPrice = couponPrice && couponPrice < displayedPrice ? couponPrice : displayedPrice;

    // EU Omnibus "lowest price in last 30 days" reference. On standard discounts it
    // is rendered inside `.product-price-before` — anchor on the stable `.cut-price`
    // wrapper, Datart keeps renaming its modifier variants (`--lessOrEqual`,
    // `--strike`, …) per discount type. The label text holds a "30 dní" digit run we
    // must skip — strip `.sr-only` and the tooltip before parsing. On coupon products
    // it is a plain `.product-price-before-30` row instead.
    const refEl = elem.querySelector(".product-price-before .cut-price")?.cloneNode(true);
    refEl?.querySelectorAll(".sr-only, ufo-tooltip, .query-icon").forEach(n => n.remove());
    const reference30El = elem.querySelector(".product-price-before-30 .product-price-before-30-price");
    const originalPrice = refEl
      ? cleanPriceText(refEl.textContent)
      : reference30El
        ? cleanPriceText(reference30El.textContent)
        : null;

    const imageUrl = elem.querySelector("#lightgallery > .product-gallery-main div.item").dataset.src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const css = `
      @media screen and (max-width: 767px) {
        #product-detail-header-top-wrapper {
          height: 972px;
        }
        #hlidacShopu {
          margin-top: 566px !important;
        }
      }
    `;

    const elem = document.querySelector(".block-info > .justify-content-end");
    if (elem) {
      const markup = renderMarkup({ "margin-bottom": "0" });
      elem.insertAdjacentElement("afterend", markup);
      const style = document.createElement("style");
      style.textContent = css;
      elem.insertAdjacentElement("afterend", style);
      return elem;
    }

    const archiveElem = document.querySelector(".product-price");
    if (archiveElem) {
      const markup = renderMarkup({ "margin-bottom": "0" });
      archiveElem.insertAdjacentElement("afterend", markup);
      const style = document.createElement("style");
      style.textContent = css;
      archiveElem.insertAdjacentElement("afterend", style);
      return archiveElem;
    }

    throw new Error("Element to add chart not found");
  }
}

registerShop(new Datart(), "datart", "datart_sk");
