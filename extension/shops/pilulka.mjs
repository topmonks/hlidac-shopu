import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Pilulka extends AsyncShop {
  constructor() {
    super();
    this.previousItemId = null;
    this.firstLoad = true;
    this.state = null;
    this.observer = null;
    this.debounceTimer = null;
  }

  get injectionPoint() {
    return ["afterend", "ul.usp"];
  }

  get waitForSelector() {
    return ".service-detail__main .rating";
  }

  async scrape() {
    try {
      const productEl = document.querySelector("[componentname='catalog.product']");
      if (!productEl) return null;

      const itemId = productEl.id;
      const title = productEl.querySelector(".service-detail__title")?.title;
      const currentPrice = cleanPrice(`.service-detail__main .product-card-price__prices`);
      const originalPrice = cleanPrice(`.service-detail__main .product-price-container .product-card-price__old`);
      const imageUrl = document.querySelector(".service-detail__main-link")?.href;

      if (!itemId || !title) return null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    } catch (err) {
      console.error("Error in scrape():", err);
      return null;
    }
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    if (this.observer) this.observer.disconnect();

    const processPage = async () => {
      const productEl = document.querySelector("[componentname='catalog.product']");
      const info = await this.scrape();

      if (!productEl || !info || info.itemId === this.previousItemId) return;

      this.previousItemId = info.itemId;
      this.state = JSON.stringify(info);

      const data = await fetchData(info);
      if (!data) return;

      render(!this.firstLoad, data);
      this.firstLoad = false;
    };

    const scheduleProcess = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(processPage, 300); // wait for DOM to stabilize
    };

    const root = document.querySelector("#__nuxt");
    if (!root) return console.error("Nuxt root container not found");

    this.observer = new MutationObserver(scheduleProcess);
    this.observer.observe(root, {
      childList: true,
      subtree: true,
    });

    // First site initial render
    scheduleProcess();
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
