import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Smarty extends AsyncShop {
  #selector = `[itemtype="http://schema.org/Product"] .buyBox`;

  get injectionPoint() {
    return ["afterend", this.#selector];
  }

  get waitForSelector() {
    return this.#selector;
  }

  async scrape() {
    const elem = document.querySelector(this.#selector);
    if (!elem) return null;

    // e.g.:
    // https://www.smarty.cz/PlayStation-5-verze-slim--p160486 (old)
    // https://www.smarty.cz/Apple-MacBook-Air-15-3-2025-...-4p219355 (new)
    // <meta itemprop="sku" content="219355">
    const locationItemIdMatch = location.pathname.match(/-(?:\d+)?p(\d+)$/);
    const itemId = locationItemIdMatch?.[1] ?? document.querySelector('meta[itemprop="sku"]')?.content;
    const title = document.querySelector("h1")?.textContent?.trim();
    const currentPrice = document
      .querySelector('[itemtype="http://schema.org/Product"] [itemprop="price"]')
      ?.getAttribute("content");
    if (!currentPrice) return null;

    const originalPrice = cleanPrice(".buyBox .font-crossed.buyBox-discount");
    const imageUrl = (
      document.querySelector('meta[property="og:image:secure_url"]') ??
      document.querySelector('meta[property="og:image"]')
    )?.content?.trim();
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Smarty(), "smarty_cz");
