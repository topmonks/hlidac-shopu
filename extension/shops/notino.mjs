import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Notino extends Shop {
  constructor() {
    super();
    this.masterId = null;
    this.lastHref = location.href;
  }

  get injectionPoint() {
    return ["beforebegin", "a[class^='styled__StyledAddToWishlist']"];
  }

  scheduleRendering(render, cleanup) {
    const elem = document.getElementById("pd-price");
    if (!elem) return false;
    render();

    new MutationObserver(() => {
      if (location.href === this.lastHref) return;
      this.lastHref = location.href;
      render(true);
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  getMasterId() {
    const apolloState = JSON.parse(
      document.getElementById("__APOLLO_STATE__").textContent
    );
    const [, [masterRes]] = Object.entries(apolloState.ROOT_QUERY).find(([k]) =>
      k.startsWith("productDetailByMasterId")
    );
    const masterId = masterRes.id.replace("Product:", "");
    console.log(`Found master id ${masterId}`); // eslint-disable-line no-console
    return masterId;
  }

  async scrape() {
    const elem = document.getElementById("pdHeader");
    if (!elem) return;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#pd-price");
    const originalPrice = cleanPrice(
      "[class^='styled__DiscountWrapper'] span[content]"
    );
    const imageUrl = document.querySelector("[class^='styled__ImgWrapper'] img")
      .src;
    let itemId = (() => {
      const match = window.location.pathname.match(/\/p-(\d+)\//);
      return match ? match[1] : null;
    })();

    if (!itemId) {
      itemId = this.masterId || this.getMasterId();
      this.masterId = itemId;
    }

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Notino(), "notino", "notino_sk");
