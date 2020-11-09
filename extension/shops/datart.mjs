import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Datart extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail-box");
    if (!elem) return;
    const itemId = document.querySelector("#product-detail-header-top-wrapper")
      .dataset.id;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".product-detail-price");
    const originalPrice = cleanPrice(
      ".product-detail-strike-price-box .original del"
    );
    const imageUrl = document.querySelector("#detail-image-0 img").src;

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

    const elem = document.querySelector(".product-detail-compare-box");
    if (elem) {
      const markup = renderMarkup({ "margin-bottom": "0" });
      elem.insertAdjacentElement("beforebegin", markup);
      const style = document.createElement("style");
      style.textContent = css;
      elem.insertAdjacentElement("beforebegin", style);
      return elem;
    }

    const archiveElem = document.querySelector(".product-detail-price-box");
    if (archiveElem) {
      const markup = renderMarkup({ "margin-bottom": "0" });
      archiveElem.insertAdjacentElement("afterend", markup);
      const style = document.createElement("style");
      style.textContent = css;
      archiveElem.insertAdjacentElement("beforebegin", style);
      return archiveElem;
    }

    throw new Error("Element to add chart not found");
  }
}

registerShop(new Datart(), "datart", "datart_sk");
