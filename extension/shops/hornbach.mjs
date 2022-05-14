import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Hornbach extends Shop {
  get injectionPoint() {
    return ["afterend", "#product-information"];
  }

  async scrape() {
    const elems = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    if (!elems) return;
    const itemUrl = document.location.href;
    const itemId = itemUrl.match(/(\d+)\/artik[e]?l.html/)?.[1];
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      if (script.textContent.includes("window.__ARTICLE_DETAIL_STATE__")) {
        const start =
          script.textContent.indexOf("window.__ARTICLE_DETAIL_STATE__ = ") +
          "window.__ARTICLE_DETAIL_STATE__ = ".length;
        const end = script.textContent.indexOf("window.pushTrackingInfo");
        const rawJson = script.textContent.substring(start, end).trim();
        const { article } = JSON.parse(rawJson);
        return {
          itemId,
          title: article.title,
          currentPrice: article.displayPrice?.price,
          originalPrice: article.guidingPrice?.price,
          imageUrl: article.metaImage.url
        };
      }
    }
  }
}

registerShop(new Hornbach(), "hornbach", "hornbach_sk");
