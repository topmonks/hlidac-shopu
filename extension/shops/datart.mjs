import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Datart extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemIdTarget = elem.querySelector(".btn.btn-link.btn-compare").id;
    if (!itemIdTarget.length) return;

    const itemId = itemIdTarget.split("-").at(-1);

    const title = elem.querySelector("h1.product-detail-title").textContent.trim();
    const displayPrice = elem.querySelector(".product-price").dataset.priceValue;
    const currentPrice = cleanPrice(".product-price-discount .price-finally") ?? displayPrice;
    const originalPrice = displayPrice !== currentPrice ? displayPrice : cleanPrice(".product-price .cut-price del");
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
