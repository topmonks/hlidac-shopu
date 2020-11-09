import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Okay extends Shop {
  async scrape() {
    const elem = document.querySelector("#page-product-detail");
    if (!elem) return;
    const data = JSON.parse(
      document.querySelector(".js-gtm-product").dataset.product
    );
    const itemId = data.id;
    const title = data.name;
    const currentPrice = data.priceWithTax;
    const originalPrice = cleanPrice("#product_price_recomended");
    const imageUrl = document.querySelector(".js-zoomingImageSmall").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    const elem = document.querySelector("#potrebujeteporadit");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = renderMarkup();
    elem.insertAdjacentElement("beforebegin", markup);
    return elem;
  }
}

registerShop(new Okay(), "okay", "okay_sk");
