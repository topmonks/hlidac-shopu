import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations => {
  const find = mutations.find((x) => {
       return x.removedNodes.length === 1 && x.target.nodeName === `DIV` && x.removedNodes[0].nodeType === 8 && x.removedNodes[0].previousSibling?.nodeType === 8;
    }
  );
  return !!find;
}

export class Pilulka extends StatefulShop {
  get detailSelector() {
    return "nonsense";
  }

  get injectionPoint() {
    return ["afterend", "ul.usp"];
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "addedNodes", "menu__item--simple");
  }

  get observerTarget() {
    return document.querySelector("#__nuxt");
  }

  async scrape() {
    try {
      const productEl = document.querySelector("[componentname='catalog.product']");
      if (!productEl) return null;

      const itemId = productEl.id;
      const title = productEl.querySelector(".service-detail__main .service-detail__title")?.title;
      const isWowDiscount = productEl.querySelector(".product-price-container .product-card-price__special-box");
      const currentPrice = cleanPrice(isWowDiscount ? `.service-detail__main .product-price-container .product-card-price__prices b` : `.service-detail__main .product-price-container .product-card-price__prices`);
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
