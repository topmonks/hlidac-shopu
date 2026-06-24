import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Pilulka extends AsyncShop {
  get waitForSelector() {
    return "[componentname='catalog.product']";
  }

  get injectionPoint() {
    // Limitation: discontinued/non-purchasable products can miss `ul.usp`
    // (e.g. https://www.pilulka.cz/indulona-original-85ml).
    return ["afterend", "ul.usp"];
  }

  async scrape() {
    try {
      const productEl = document.querySelector("[componentname='catalog.product']");
      if (!productEl) return null;

      const itemId = productEl.id;
      const title = productEl.querySelector(".service-detail__main .service-detail__title")?.title;
      const isWowDiscount = productEl.querySelector(".product-price-container .product-card-price__special-box");
      const currentPrice = cleanPrice(
        isWowDiscount
          ? `.service-detail__main .product-price-container .product-card-price__prices b`
          : `.service-detail__main .product-price-container .product-card-price__prices`
      );
      const originalPrice = cleanPrice(`.service-detail__main .product-price-container .product-card-price__old`);
      const imageUrl = document.querySelector(".service-detail__main-link")?.href;

      if (!itemId || !title) return null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    } catch (err) {
      console.error("Error in scrape():", err);
      return null;
    }
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
