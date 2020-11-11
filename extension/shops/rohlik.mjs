import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(
      y => y.id === "productDetail" || y.innerHTML.indexOf("productDetail") > 0
    )
  );

export class Rohlik extends StatefulShop {
  get injectionPoint() {
    return ["afterend", "#productDetail .AmountCounter"];
  }

  get detailSelector() {
    return "#productDetail";
  }

  get observerTarget() {
    return document.querySelector("#__next");
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "product_detail_modal");
  }

  async scrape() {
    const elem = document.querySelector("#productDetail");
    if (!elem) return;
    const itemId = document.querySelector(
      "#productDetail button[data-product-id]"
    ).dataset.productId;
    const title = document.title.split("-");
    const t = title[0].trim();
    const currentPrice = cleanPrice(
      `#productDetail .actionPrice,
       #productDetail .currentPrice`
    );
    const originalPrice = cleanPrice("#productDetail del");
    const imageUrl = document.querySelector("[data-gtm-item=product-image] img")
      .src;

    return { itemId, title: t, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Rohlik(), "rohlik");
