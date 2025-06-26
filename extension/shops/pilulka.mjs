import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Pilulka extends AsyncShop {
  get injectionPoint() {
    return ["afterend", ".service-detail__basket-box"];
  }

  get waitForSelector() {
    return ".body-product-detail";
  }

  async scrape() {
    // do not parse JSON+ld that it has not changed during transitions
    const title = document.querySelector(".service-detail__title ").title;
    const itemId = document.querySelector("[componentname='catalog.product']").id;
    const currentPrice = cleanPrice(`.product-card-price__prices`);
    const originalPrice = cleanPrice(`.product-price-container .product-card-price__old`);
    const imageUrl = document.querySelector(".service-detail__main-link").href;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
