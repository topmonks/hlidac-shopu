import { cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Datart extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemIdTarget = elem.querySelector(".btn.btn-link.btn-compare").id;
    if (!itemIdTarget.length) return;

    const itemId = itemIdTarget.split("-").at(-1);

    const title = elem.querySelector("h1.product-detail-title").textContent.trim();
    const currentPrice = Number(elem.querySelector(".product-price").dataset.priceValue);

    // EU Omnibus "lowest price in last 30 days" reference, rendered inside
    // `.product-price-before` only on discounted products (including coupon
    // discounts already baked into `data-price-value`). Anchor on the stable
    // `.cut-price` wrapper — Datart keeps renaming its modifier variants
    // (`--lessOrEqual`, `--strike`, …) per discount type. The label text
    // holds a "30 dní" digit run we must skip — strip `.sr-only` and the
    // tooltip before parsing.
    const refEl = elem.querySelector(".product-price-before .cut-price")?.cloneNode(true);
    refEl?.querySelectorAll(".sr-only, ufo-tooltip, .query-icon").forEach(n => n.remove());
    const originalPrice = refEl ? cleanPriceText(refEl.textContent) : null;

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
