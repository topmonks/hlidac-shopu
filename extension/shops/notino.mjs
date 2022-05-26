import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Notino extends Shop {
  constructor() {
    super();
    this.masterId = null;
    this.lastHref = location.href;
  }

  get injectionPoint() {
    return ["afterbegin", "#pdAddToCart"];
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    const elem = document.getElementById("pd-price");
    if (!elem) return false;

    const info = await this.scrape();
    if (!info) return;
    const data = await fetchData(info);
    if (!data) return;
    render(false, data);

    new MutationObserver(async () => {
      if (location.href === this.lastHref) return;
      this.lastHref = location.href;

      const info = await this.scrape();
      if (!info) return;
      const data = await fetchData(info);
      if (!data) return;
      render(true, data);
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  getMasterId() {
    const apolloState = JSON.parse(
      document.getElementById("__APOLLO_STATE__").textContent
    );
    const [key] = Object.entries(apolloState.ROOT_QUERY).find(([k]) =>
      k.startsWith("productDetailByMasterId")
    );
    // const masterId = masterRes.id.replace("Product:", "");
    const masterId = key.match(/masterId":"(\d+)/)?.[1];
    console.log(`Found master id ${masterId}`); // eslint-disable-line no-console
    return masterId;
  }

  async scrape() {
    const elem = document.getElementById("pdHeader");
    if (!elem) return;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#pd-price");
    const originalPrice = cleanPrice(
      ":not(#pd-price) > span[content]:first-of-type"
    );
    const imageUrl = document.getElementById(
      "pd-image-main"
    )?.src;
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
