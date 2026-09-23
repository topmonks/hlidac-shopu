import { getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Eva extends AsyncShop {
  get waitForSelector() {
    return ".main_content h1";
  }

  // Desktop: below the yellow buy panel (.deskbox) in the right column.
  // Below 992px that column is hidden and the page shows a .for-mobile block
  // under the gallery instead.
  get injectionPoint() {
    if (this.isMobileDetailPage()) {
      return ["beforebegin", ".main_content .for-mobile"];
    } else {
      return ["afterend", ".main_content .deskbox"];
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
    const rightColumn = document.querySelector(".main_content .zb-rg-col");
    return !rightColumn || window.getComputedStyle(rightColumn).display === "none";
  }
}

registerShop(new Eva(), "eva_cz");
