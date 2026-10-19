import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Price history is kept per article (colour, size), the `article_id` of the URL. Picking a variant
// puts it into the URL; a bare product URL shows the default article named by the JSON-LD Product.
function articleUrl() {
  if (new URL(location.href).searchParams.has("article_id")) return location.href;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const { url } = JSON.parse(script.textContent);
      if (url?.includes("article_id=")) return new URL(url, location.href).href;
    } catch {}
  }
  return location.href;
}

export class Tchibo extends AsyncShop {
  selector = ".crosschannel";

  get injectionPoint() {
    return ["afterend", this.selector];
  }

  get waitForSelector() {
    return this.selector;
  }

  async scrape() {
    const elem = document.querySelector(".pdp-buybox__add-to-cart-container");
    if (!elem) return;
    const url = articleUrl();
    const itemId = new URL(url).searchParams.get("article_id") ?? new URL(url).pathname.split("/").at(-2);
    const title = document.querySelector(".pdp-buybox__title").textContent.trim();
    const currentPrice = cleanPrice("#pdp-buybox .tp-price-current .tp-price-number");
    const originalPrice = cleanPrice("#pdp-buybox .pdp-price-display__lowest-price-note .tp-price-number");
    const imageUrl = document.querySelector(".tp-imagegallery-main-container img")?.src;

    return { itemId, title, currentPrice, originalPrice, imageUrl, url };
  }
}

registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk");
