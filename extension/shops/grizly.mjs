import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Grizly extends Shop {
  /**
   * @returns {[InsertPosition, string]}
   */
  get injectionPoint() {
    return ["afterend", "#DetailForm"];
  }

  async scrape() {
    const form = document.forms.DetailForm;
    if (!form) return;

    const itemId = form.iditem.value;
    const title = document.querySelector("[property='og:title']").content;
    const currentPrice = cleanPrice(".coupons .coupon-price") ?? document.querySelector("[itemprop=price]").content;
    const imageUrl = new URL(document.querySelector("[itemprop=image]").src, location.href).href;
    const originalPrice = cleanPrice(".pricevat.pd__data-price-regular");

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Grizly(), "grizly_cz", "grizly_sk");
