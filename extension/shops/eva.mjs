import {
  cleanPrice,
  cleanUnitPriceText,
  registerShop,
  getItemIdFromUrl
} from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Eva extends Shop {
  get injectionPoint() {
    if (this.isMobileDetailPage()) {
      return ["beforebegin", ".zpanel-price-mobile div.pb-3"];
    } else {
      return ["beforebegin", ".zpanel-price div.pb-3"];
    }
  }

  async scrape() {
    const elem = document.querySelector(".main_content");
    if (!elem) return;

    const itemId = getItemIdFromUrl(window.location);
    const title = elem.querySelector("meta[itemprop=name]").content.trim();
    const currentPrice = cleanUnitPriceText(
      elem.querySelector("meta[itemprop=price]").content.trim()
    );
    const originalPrice = null;
    const imageUrl = elem.querySelector("div#icontainer_in img").src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  isMobileDetailPage() {
    const elem = document.querySelector("div.zpanel-price-mobile");
    const style = window.getComputedStyle(elem);
    return style.display === "block";
  }
}

registerShop(new Eva(), "eva_cz");
