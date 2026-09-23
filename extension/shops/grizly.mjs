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

    // Every package variant (e.g. single pack vs. 5× multipack) renders its own
    // price block in the variant dropdown, so read all prices from the selected
    // variant's block. Page-wide lookups would mix prices across variants.
    const priceBlock =
      document.querySelector(".js-custom-select-selected .pd__data-variants-select-price") ??
      document.querySelector("li.is--selected .pd__data-variants-select-price") ??
      document.querySelector(".pd__data-variants-select-price");
    if (!priceBlock) return;
    const couponPrice = cleanPrice(priceBlock.querySelector(".pd__data-variants-select-price-code"));
    const oldPrice = cleanPrice(priceBlock.querySelector(".pd__data-variants-select-price-old"));
    const regularPrice = cleanPrice(priceBlock.querySelector(".regular"));

    const currentPrice = couponPrice ?? regularPrice;
    const originalPrice = oldPrice ?? regularPrice;
    const imageUrl = document.querySelector("[property='og:image']").content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Grizly(), "grizly_cz", "grizly_sk");
