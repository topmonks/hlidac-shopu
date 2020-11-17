import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Okay extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".box-presents, .annotation"];
  }

  async scrape() {
    const elem = document.querySelector("#page-product-detail");
    if (!elem) return;
    const data = JSON.parse(
      document.querySelector(".js-gtm-product").dataset.product
    );
    const itemId = data.id;
    const title = data.name;
    const afterSale = cleanPrice(".flagmzdetail>span>span");
    const currentPrice = afterSale || data.priceWithTax;
    const originalPrice = cleanPrice("#product_price_recomended");
    const imageUrl = document.querySelector(".js-zoomingImageSmall").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Okay(), "okay", "okay_sk");
