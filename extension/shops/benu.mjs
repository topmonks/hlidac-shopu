import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Benu extends AsyncShop {
  get waitForSelector() {
    return "#product-detail-module form";
  }

  get injectionPoint() {
    return ["afterend", "#product-detail-module form"];
  }

  async scrape() {
    const richSnippetEl = document.querySelector("#snippet-productRichSnippet-richSnippet");
    if (!richSnippetEl) return;
    const richSnippet = JSON.parse(richSnippetEl.textContent);

    const title = richSnippet.name || document.querySelector("h1")?.textContent?.trim();
    const itemId = richSnippet.identifier;
    const currentPrice = richSnippet.offers?.price?.toString();
    const originalPrice = cleanPrice("#product-detail-module .line-through");
    const imageUrl = document.querySelector("meta[property='og:image']")?.content;

    return { title, itemId, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Benu(), "benu");
