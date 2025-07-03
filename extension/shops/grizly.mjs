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

    const couponPrice = cleanPrice(".coupons .coupon-price");
    const oldPrice = cleanPrice(".pd__data-price-old");
    const regularPrice = cleanPrice(".pd__data-price-regular");

    const currentPrice = couponPrice ?? regularPrice;
    const originalPrice = oldPrice ?? regularPrice;
    const imageUrl = new URL(document.querySelector("[itemprop=image]").src, location.href).href;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Grizly(), "grizly_cz", "grizly_sk");
