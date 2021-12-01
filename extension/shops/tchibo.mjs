import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Tchibo extends Shop {
  async scrape() {
    const elem = document.querySelector(".c-tp-simplebutton--order");
    if (!elem) return;
    const itemUrl = document.location.href;
    const itemId = itemUrl.match(/\/p(\d+)/)?.[1];
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".c-tp-price-currentprice");
    const originalPrice = cleanPrice(".c-tp-price-oldprice .c-tp-price-output");
    const imageUrl = document.querySelector(".m-tp-productimagegallery-preview-wrapper > a > img")?.src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    let elem = document.querySelector(".m-tp-base-column--leftaligned .c-tp-simplebutton--order");
    console.log(elem);
    if (elem) {
      const markup = renderMarkup();
      elem.insertAdjacentElement("afterend", markup);
      return elem;
    }

    // eng variant
    elem = document.querySelector("#carButtons .testdrive-bonus");
    if (!elem) throw new Error("Element to add chart not found");

    const table = document.querySelector("#carButtons table");
    table.style.position = "relative";
    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk")
