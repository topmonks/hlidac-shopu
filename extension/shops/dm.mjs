import { cleanPriceText, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(
      y =>
        y.localName === "div" &&
        y.dataset.dmid === "bottom-detail-page-reco-slider"
    )
  );

const didMutate = mutations =>
  mutations.find(x => Array.from(x.removedNodes).find(y => y.id === "dm-view"));

export class Dm extends StatefulShop {
  get injectionPoint() {
    return [
      "afterend",
      "div[data-dmid='detail-page-base-price-and-availability-container']"
    ];
  }

  get detailSelector() {
    return "div[itemtype='http://schema.org/Product']";
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return didMutate(mutations);
  }

  async scrape() {
    const elem = document.querySelector(
      "div[itemtype='http://schema.org/Product']"
    );
    if (!elem) return;
    const itemId = elem.querySelector("meta[itemprop='gtin13']").content.trim();
    const titleSource = elem.querySelectorAll("meta[itemprop='name']");
    const title = `${titleSource[1].content.trim()} ${titleSource[0].content.trim()}`;
    const currentPrice = elem
      .querySelector("meta[itemprop=price]")
      .content.trim();
    const originalPriceSource = elem.querySelector(
      "div[data-dmid='sellout-price-container']"
    );
    const originalPrice = originalPriceSource
      ? cleanPriceText(originalPriceSource.textContent.trim())
      : null;
    const imageUrl = elem.querySelector("link[itemprop='image']").href;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Dm(), "dm_cz", "mojadm_sk");
