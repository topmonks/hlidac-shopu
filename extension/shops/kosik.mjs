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
    const elem = document.querySelector("article[data-tid=product-detail]");
    if (!elem) return;
    try {
      const itemId = elem.querySelector('[id^="product-detail-"]')?.id?.match(/\d+/)?.[0];
      const title = elem.querySelector("[data-tid=product-detail__product-name]")?.textContent?.trim();
      const priceParts = elem.querySelectorAll("[data-tid=pbox-price] span > span");
      const currentPrice =
        priceParts.length >= 2
          ? `${priceParts[0].textContent.trim()}.${priceParts[1].textContent.trim()}`
          : null;
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
