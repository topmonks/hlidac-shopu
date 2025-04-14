import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Lidl extends AsyncShop {
  get waitForSelector() {
    return ".detail-one .block--mobile-hidden .buybox-one";
  }

  get injectionPoint() {
    return ["beforebegin", ".detail-one .block--mobile-hidden .buybox-one"];
  }

  async scrape() {
    const elem = document.querySelector(".block--mobile-hidden .heading__title");
    if (!elem) return;
    const itemId = document.querySelector(".block--mobile-hidden .product-id__number").textContent;
    const title = document.querySelector(".block--mobile-hidden [data-qa-label='keyfacts-title']").textContent.trim();
    const currentPrice = cleanPrice(".block--mobile-hidden .buybox-one .m-price__price");
    const originalPrice = cleanPrice(".block--mobile-hidden .buybox-one .m-price__rrp");
    const imageUrl = document.querySelector(".media-carousel-slider .media-carousel-item[data-index='0'] .image").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}
registerShop(new Lidl(), "lidl_cz");
