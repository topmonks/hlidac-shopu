import { cleanPrice, registerShop, isElementVisible } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Okay extends Shop {
  get injectionPoint() {
    return ["afterend", ".product-form-container"];
  }

  async scrape() {
    const elem = document.querySelector("#template-product");
    if (!elem) return;
    const itemId = document.querySelector("div.product-gallery__main")
      .attributes["data-product-id"].textContent;
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

    const priceAfterDiscountSel = ".modal_price  .current_price_mz .money.sale";
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
    console.log("originalPrice", originalPrice);
    const currentPrice = priceAfterDiscount ? priceAfterDiscount : price;
    console.log("currentPrice", currentPrice);
    const title = elem.querySelector("h1").innerText.trim();
    const imageUrl = document.querySelector(".product-gallery__link").href;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Okay(), "okay_cz", "okay_sk");
