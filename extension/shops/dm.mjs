import { cleanPriceText, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Dm extends StatefulShop {
  get detailSelector() {
    return "script[type='application/ld+json'][data-source=composing-ui]";
  }

  shouldRender(mutations) {
    return Boolean(
      mutations.find(x => x.target.classList.contains("bv-content-list-container") && x.removedNodes.length)
    );
  }

  shouldCleanup(mutations) {
    return Boolean(mutations.find(x => x.target.id === "mainSectionContainer" && x.removedNodes.length));
  }

  get injectionPoint() {
    return ["beforebegin", `[data-dmid=detail-availability-container]`];
  }

  async scrape() {
    const data = JSON.parse(document.querySelector(this.detailSelector).textContent);
    if (!data) return;
    const itemId = data.gtin ?? data.sku;
    const title = data.name;
    const currentPrice = data.offers.price;
    const originalPrice = cleanPriceText(
      document.querySelector('[data-dmid="price-sellout"]')?.textContent?.trim() ?? ""
    );
    const imageUrl = data.image;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Dm(), "dm_cz", "mojadm_sk");
