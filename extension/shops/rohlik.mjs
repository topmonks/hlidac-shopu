import {
  cleanPrice,
  cleanUnitPrice,
  isUnitPrice,
  registerShop
} from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(y => y.id === "productDetail")
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
    if (!elem) return null;

    const originalPrice = isUnitPrice("#productDetail del")
      ? cleanUnitPrice(
          "#productDetail del",
          cleanPrice("#productDetail .detailQuantity")
        )
      : cleanPrice("#productDetail del");

    const jsonld = elem.querySelector('script[type="application/ld+json"]');
    if (jsonld) {
      try {
        const data = JSON.parse(jsonld.innerText);
        return {
          itemId: data.sku,
          title: data.name,
          currentPrice: data.offers.price.toFixed(2),
          imageUrl: `https://www.rohlik.cz/cdn-cgi/image/f=auto,w=500,h=500/https://cdn.rohlik.cz${data.image[0]}`,
          originalPrice
        };
      } catch (e) {
        console.error("Could not find product info", e);
      }
    }

    const itemId = document.querySelector(
      "#productDetail button[data-product-id]"
    ).dataset.productId;
    const title = document.title.split("-");
    const t = title[0].trim();
    const currentPrice = cleanPrice(
      `#productDetail .actionPrice,
       #productDetail .currentPrice`
    );
    const imageUrl = document.querySelector(
      "[data-gtm-item=product-image] img"
    ).src;
    
    return { itemId, title: t, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Rohlik(), "rohlik");
