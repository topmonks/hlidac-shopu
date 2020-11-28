import { registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Prozdravi extends Shop {
  get injectionPoint() {
    return ["afterend", "#product-prices-block"];
  }

  async scrape() {
    const data = JSON.parse(document.querySelector("#gtm-data input").value);
    const masterData = document.querySelector(".product-master-data");

    const title = data.name;
    const itemId = data.id;

    const { value: originalPrice } = JSON.parse(
      masterData.querySelector("input[name=backupPrice]").value
    );
    const { value: currentPrice } = JSON.parse(
      masterData.querySelector("input[name=price]").value
    );
    const imageUrl = document.querySelector("meta[property='og:image']")
      .content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Prozdravi(), "prozdravi");
