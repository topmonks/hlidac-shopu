import { cleanPrice, registerShop, isElementVisible } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Okay extends Shop {
  selector = ".product-form-container";

  get injectionPoint() {
    return ["afterend", this.selector, { display: "block !important" }];
  }

  async scrape() {
    const elem = document.querySelector(this.selector);
    if (!elem) return;
    const product = JSON.parse(
      elem.querySelector("[data-product]").dataset.product
    );
    const itemId = product.id;
    const title = product.title;
    const imageUrl = product.featured_image;

    const manufacturersRecommendedPriceSel = ".modal_price .was-price .money";
    const manufacturersRecommendedPriceVisible = isElementVisible(
      document.querySelector(manufacturersRecommendedPriceSel)
    );
    const manufacturersRecommendedPrice = manufacturersRecommendedPriceVisible
      ? cleanPrice(manufacturersRecommendedPriceSel)
      : null;
    const priceSel = ".modal_price .current_price .money";
    const priceVisible = isElementVisible(document.querySelector(priceSel));
    const price = priceVisible ? cleanPrice(priceSel) : null;
    const priceAfterDiscountSel = ".modal_price .current_price_mz .money.sale";
    const priceAfterDiscountVisible = isElementVisible(
      document.querySelector(priceAfterDiscountSel)
    );
    const priceAfterDiscount = priceAfterDiscountVisible
      ? cleanPrice(priceAfterDiscountSel)
      : null;
    const originalPrice = manufacturersRecommendedPrice
      ? manufacturersRecommendedPrice
      : priceAfterDiscount
      ? price
      : null;
    const currentPrice = priceAfterDiscount ? priceAfterDiscount : price;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Okay(), "okay_cz", "okay_sk");
