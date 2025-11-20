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

    const couponPrice = cleanPrice(".pd__data-variants-select-price .pd__data-variants-select-price-code");
    const oldPrice = cleanPrice(".pd__data-variants-select-price .pd__data-variants-select-price-old");
    const regularPrice = cleanPrice(".pd__data-variants-select-price .regular");

    const currentPrice = couponPrice ?? regularPrice;
    const originalPrice = oldPrice ?? regularPrice;
    const imageUrl = document.querySelector("[property='og:image']").content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Grizly(), "grizly_cz", "grizly_sk");
