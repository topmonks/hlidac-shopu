import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class TSBohemia extends AsyncShop {
  get waitForSelector() {
    // present on both available and disabled (out-of-stock / discontinued) product pages
    return ".product-detail .product-detail__content";
  }

  get injectionPoint() {
    return ["beforeend", ".product-detail .product-detail__content"];
  }

  async scrape() {
    // Bail when not on a product detail URL — TS Bohemia's Next.js SPA fires
    // observer mutations during route transitions and other state updates
    // when there is no actual product on the page. Without this guard we
    // would call the API with non-product URLs and produce noisy
    // "Data not found" errors.
    const itemId = location.pathname.match(/_d(\d+)(?:\.html)?$/)?.[1];
    if (!itemId) return;

    const detail = document.querySelector(".product-detail");
    if (!detail) return;

    const title = detail.querySelector("h1.product-title__headline")?.textContent?.trim();
    const currentPrice = cleanPrice(detail.querySelector(".product-detail__price .product-tile__price-value"));
    const originalPrice = cleanPrice(detail.querySelector(".product-detail__price .product-tile__price-del"));
    const imageUrl = detail.querySelector(".product-detail__gallery img")?.src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new TSBohemia(), "tsbohemia");
