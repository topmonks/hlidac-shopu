import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Mountfield extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".box-detail-info__links"];
  }

  async scrape() {
    const elem = document.querySelector(".box-detail");
    if (!elem) return;
    const itemId = elem
      .querySelector("meta[itemprop=sku]")
      .content.trim()
      .toLowerCase();
    const title = elem
      .querySelector("h1.box-detail__heading")
      .textContent.trim();
    let currentPrice = elem
      .querySelector("meta[itemprop=price]")
      .content.trim();
    let originalPrice = cleanPrice(
      ".box-detail-add__prices__item__text__price"
    );

    const loyaltyPrice = cleanPrice(".box-detail-add__prices__item__club");
    if (!originalPrice && loyaltyPrice) {
      originalPrice = currentPrice;
      currentPrice = loyaltyPrice;
    }

    const imageUrl = elem.querySelector("img[itemprop=image]").src;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Mountfield(), "mountfield", "mountfield_sk");
