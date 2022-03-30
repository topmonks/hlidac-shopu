import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mall extends Shop {
  constructor() {
    super();
    this.loaded = false;
    this.lastHref = null;
    this.firstLoad = true;
    this.state = null;
  }

  get injectionPoint() {
    return [
      "afterend",
      `.product-footer,
       .other-options-box,
       .detail-prices-wrapper,
       .info-box`
    ];
  }

  get waitForSelector() {
    return ".info-box";
  }

  async scrape() {
    const elem = document.querySelector(
      `.price-wrapper,
      .prices-wrapper,
      .price__wrap`
    );
    if (!elem) return null;

    const itemId = document
      .querySelector(
        `span[data-sel="catalog-number"],
        .additional-info__catalog-number span`
      )
      .innerText.trim()
      .replace("a", "");
    const title = document.querySelector("h1.detail__title").innerText.trim();
    const currentPrice = cleanPrice(
      `[itemprop=price],
       .price__wrap__box__final`
    );
    if (!currentPrice) return null;

    const originalPrice = cleanPrice(
      `.old-new-price .rrp-price,
       .old-price > del:nth-child(1),
        .price__wrap__box__old`
    );
    const imageUrl = document.querySelector(".gallery-magnifier__normal")?.src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    // Start observing the target node for configured mutations
    new MutationObserver(async () => {
      if (location.href !== this.lastHref) {
        this.loaded = false;
        this.lastHref = location.href;
      }
      if (this.loaded) return;

      const elem = document.querySelector(this.waitForSelector);
      if (!elem) {
        cleanup();
        this.loaded = false;
        this.firstLoad = true;
        return;
      }
      const info = await this.scrape();
      if (!info) return;
      const serializedState = JSON.stringify(info);
      if (serializedState === this.state) return;
      this.state = serializedState;
      const data = await fetchData(info);
      if (!data) return;
      this.loaded = true;
      render(!this.firstLoad, data);
      this.firstLoad = false;
    }).observe(document.body, {
      subtree: true,
      characterData: true
    });

    if (!document.querySelector(this.waitForSelector)) return;
    const info = await this.scrape();
    if (!info) return;
    this.lastHref = location.href;
    this.state = JSON.stringify(info);
    const data = await fetchData(info);
    if (!data) return;
    this.loaded = true;
    render(false, data);
    this.firstLoad = false;
  }
}

registerShop(new Mall(), "mall", "mall_sk");
