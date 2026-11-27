import { getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Boukal extends AsyncShop {
  get injectionPoint() {
    return ["afterend", ".product_detail .preBuy_box"];
  }

  get waitForSelector() {
    return ".product_detail .preBuy_box";
  }

  async scrape(document = globalThis.document, url = globalThis.location.href) {
    const itemId = getItemIdFromUrl(new URL(url));
    const product = document.querySelector(".product_detail");
    const title = product?.querySelector("#productTitlePc")?.textContent.trim();
    const offer = product?.querySelector(".preBuy_box");
    const currentPrice = offer?.querySelector('.current_price [itemprop="price"]')?.getAttribute("content");
    const currency = offer?.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content");
    if (!itemId || !title || !(Number(currentPrice) > 0) || currency !== "CZK") return;
    return {
      itemId,
      title,
      currentPrice,
      originalPrice: null,
      imageUrl: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || null
    };
  }
}

registerShop(new Boukal(), "boukal_cz");
