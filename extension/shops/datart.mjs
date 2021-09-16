import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Datart extends Shop {
  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemIdTarget = elem
      .getElementsByClassName("btn btn-cart ajax")[0]
      .getAttribute("data-target");
    if (!itemIdTarget.length > 1) return;

    const searchParams = new URLSearchParams(itemIdTarget);
    const itemId = searchParams.get("id");

    const title = elem
      .querySelector("h1.product-detail-title")
      .textContent.trim();
    const currentPrice = elem
      .getElementsByClassName("product-price")[0]
      .getAttribute("data-price-value");
    const originalPrice = cleanPrice(".product-price .cut-price del");
    const imageUrl = elem
      .querySelector("#lightgallery > .product-gallery-main div.item")
      .getAttribute("data-src");
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
