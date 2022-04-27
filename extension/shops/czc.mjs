import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class CZC extends Shop {
  get injectionPoint() {
    return ["beforeend", ".pd-price-delivery"];
  }

  async scrape() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return null;
    const itemId = elem.dataset.productCode.replace("a", "");
    const title = document.querySelector("h1").getAttribute("title");
    const currentPrice = cleanPrice(".pd-info .price .price-vatin");
    if (!currentPrice) return null;
    const originalPrice = cleanPrice(".pd-info .price-before .price-vatin");
    const imageElement = document.querySelector(
      "#pd-image [scroll-into-view] img"
    );
    const imageUrl = imageElement ? imageElement.src : null;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new CZC(), "czc");
