import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class TSBohemia extends Shop {
  get injectionPoint() {
    return ["beforebegin", ".product-tools"];
  }

  async scrape() {
    const elem = document.querySelector("#stoitem_detail");
    if (!elem) return;
    const itemId = document.querySelector(".sti_detail_head").dataset.stiid;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = document
      .querySelector(".prc.wvat .price")
      .textContent.split("Kč")[0]
      .replace(",-", "")
      .replace(/\s/g, "");
    const originalPrice = cleanPrice(
      ".prc.endprc .price, .prc.endprc .line_through"
    );
    const imageUrl = document.querySelector("#sti_bigimg img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new TSBohemia(), "tsbohemia");
