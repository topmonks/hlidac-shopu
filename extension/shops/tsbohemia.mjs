import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class TSBohemia extends Shop {
  async scrape() {
    const elem = document.querySelector("#stoitem_detail");
    if (!elem) return;
    const itemId = document.querySelector(".sti_detail_head").dataset.stiid;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = document
      .querySelector(".prc.wvat .price")
      .textContent.split("Kč")[0]
      .replace(",-", "")
      .replace(/\s/g, "");
    const originalPrice = cleanPrice(
      ".prc.endprc .price, .prc.endprc .line_through"
    );
    const imageUrl = document.querySelector("#sti_bigimg img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector(".product-tools");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup({
      width: "calc(100% - 32px)",
      "align-self": "center"
    });
    elem.insertAdjacentElement("beforebegin", markup);
    return elem;
  }
}

registerShop(new TSBohemia(), "tsbohemia");
