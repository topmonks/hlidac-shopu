import { cleanPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(
      y =>
        (y.localName === "div" &&
          y.className === "row" &&
          y.nextElementSibling.id === "product-detail-actions") ||
        (y.localName === "li" &&
          typeof y.classList !== "undefined" &&
          y.classList.contains("breadcrumb__item"))
    )
  );

export class Electroworld extends StatefulShop {
  get injectionPoint() {
    return ["beforeend", "#product-detail-actions"];
  }

  get detailSelector() {
    return "#product-detail-actions";
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "client-only-placeholder");
  }

  async scrape() {
    const jsonld = document.querySelectorAll(
      'script[type="application/ld+json"]'
    )[0];
    if (!jsonld) return null;
    try {
      const data = JSON.parse(jsonld.innerText);
      if (data["@type"] !== "Product") return null;
      return {
        title: data.name,
        currentPrice: data.offers.price,
        originalPrice: cleanPrice(".product-top__prices span del"),
        imageUrl: data.image
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  }
}

registerShop(new Electroworld(), "electroworld_cz");
