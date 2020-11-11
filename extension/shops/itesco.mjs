import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(
    x =>
      x.target.classList.contains("main__content") &&
      x.addedNodes.length === 1 &&
      x.addedNodes[0].innerHTML.indexOf("product-details-page") > 0
  );

export class Tesco extends StatefulShop {
  get detailSelector() {
    return ".product-details-page";
  }

  get observerTarget() {
    return document.body;
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "loading-spa");
  }

  async scrape() {
    const elem = document.querySelector(".product-details-page");
    if (!elem) return;
    const href = window.location.href;
    const match = href.match(/(\d+)$/);
    let itemId = null;
    if (match && match[1]) {
      itemId = match[1];
    }
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".price-per-sellable-unit .value");
    const imageUrl = document.querySelector(".product-image").src;
    // TODO: parse originalPrice with regex from .promo-content-small .offer-text
    return { itemId, title, currentPrice, imageUrl };
  }

  inject(renderMarkup) {
    let elem = document.querySelector(".product-controls__wrapper");
    if (!elem) throw new Error("Element to add chart not found");

    const styles = {
      width: "60%",
      float: "right",
      margin: "0 16px 16px"
    };
    const markup = renderMarkup(styles);
    elem.insertAdjacentElement("afterend", markup);
    const style = document.createElement("style");
    style.textContent = `
      @media screen and (max-width: 767px) {
        .product-details-tile .product-controls--wrapper .basket-feedback__wrapper {
          min-height: 0;
        }
        #hlidacShopu {
          margin-top: 0 !important;
          width: calc(100% - 32px) !important;
        }
      }
    `;
    elem.insertAdjacentElement("beforebegin", style);
    return elem;
  }
}

registerShop(new Tesco(), "itesco", "itesco_sk");
