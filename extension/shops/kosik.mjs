import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(
      y => (typeof y.classList !== "undefined" &&  y.classList.contains("product-detail-modal")) || (y.localName === "article" && y.dataset.tid === "product-detail")
    )
  );

export class Kosik extends StatefulShop {
  get injectionPoint() {
    return ["afterend", ".product-header-box"];
  }

  get detailSelector() {
    return "article[data-tid=product-detail]";
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "product-detail-modal");
  }

  async scrape() {
    const elem = document.querySelector(
      "article[data-tid=product-detail]"
    );
    if (!elem) return;
    try {
      const data = {};
      data.itemId = elem.querySelector("[itemprop=productID]").getAttribute("content");
      data.title = elem.querySelector("[itemprop=name]").textContent;
      data.currentPrice = cleanPriceText(elem.querySelector("[itemprop=price]").textContent);
      data.originalPrice = cleanPrice(".product-header-box s");
      data.imageUrl = elem.querySelector("[itemprop=image] img").getAttribute("srcset").split(',').pop().trim().split(' ')[0];
      return data;
    } catch (e) {
      console.error("Could not find product info", e);
    }
  }
}

registerShop(new Kosik(), "kosik");
