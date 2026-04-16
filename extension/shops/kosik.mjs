import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Kosik extends AsyncShop {
  get waitForSelector() {
    return "article[data-tid=product-detail] [data-tid=pbox-price]";
  }

  get injectionPoint() {
    return ["beforebegin", "[data-tid=product-detail__origin]"];
  }

  async scrape() {
    // Bail when not on a product detail URL — Kosik renders the product detail
    // in a popup over the category page, and the observer fires for every
    // intermediate state (modal closing, related-product clicks, etc). The
    // article element still holds the previous product's data during those
    // moments, so without this check we would scrape the stale data and call
    // the API with a category URL that has no `/pNNN` slug — producing noisy
    // "Data not found" errors and zero useful work.
    const urlMatch = location.pathname.match(/\/p(\d+)/);
    if (!urlMatch) return;

    const elem = document.querySelector("article[data-tid=product-detail]");
    if (!elem) return;

    // Also verify the article element matches the current URL — Vue may
    // briefly hold the previous product's content while transitioning.
    const articleId = elem.querySelector('[id^="product-detail-"]')?.id?.match(/\d+/)?.[0];
    if (articleId !== urlMatch[1]) return;

    try {
      const itemId = articleId;
      const title = elem.querySelector("[data-tid=product-detail__product-name]")?.textContent?.trim();
      const priceParts = elem.querySelectorAll("[data-tid=pbox-price] span > span");
      const currentPrice =
        priceParts.length >= 2 ? `${priceParts[0].textContent.trim()}.${priceParts[1].textContent.trim()}` : null;
      const originalPrice = cleanPrice("[data-tid=product-box__crossed-price]");
      const imageUrl = elem
        .querySelector("[data-tid=product-detail__product-image]")
        ?.getAttribute("srcset")
        ?.split(",")
        ?.pop()
        ?.trim()
        ?.split(" ")[0];
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  }
}

registerShop(new Kosik(), "kosik");
