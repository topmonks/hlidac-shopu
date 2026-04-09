import { getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Eva extends AsyncShop {
  get waitForSelector() {
    return ".main_content h1";
  }

  get injectionPoint() {
    if (this.isMobileDetailPage()) {
      return ["beforebegin", ".zpanel-price-mobile div.pb-3"];
    } else {
      return ["beforebegin", ".zpanel-price div.pb-3"];
    }
  }

  async scrape() {
    if (!document.querySelector(".main_content")) return;

    const itemId = getItemIdFromUrl(window.location);
    if (!itemId) return;
    const title = document.querySelector(".main_content h1")?.textContent?.trim();
    if (!title) return;

    // Current price is best-effort: prefer GTM dataLayer if it's already populated,
    // otherwise leave null — chart will still render historical data.
    const product = window.dataLayer?.find(x => x?.ecomm_pagetype === "product");
    const currentPrice = product?.ecomm_priceproduct?.toString() ?? null;
    const originalPrice = null;
    const imageUrl = document.querySelector('meta[property="og:image"]')?.content;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  isMobileDetailPage() {
    const elem = document.querySelector("div.zpanel-price-mobile");
    if (!elem) return false;
    const style = window.getComputedStyle(elem);
    return style.display === "block";
  }
}

registerShop(new Eva(), "eva_cz");
