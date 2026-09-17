import { cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// 4camping.sk formats prices like "1.200,41 €", drop the thousands separator dots
function cleanPrice(selector) {
  return cleanPriceText(document.querySelector(selector)?.textContent.replace(/\.(?=\d{3}\b)/g, ""));
}

export class ForCamping extends AsyncShop {
  get waitForSelector() {
    return "#formProductAddToBasket";
  }

  get injectionPoint() {
    return ["beforebegin", "#priceInfo>.product-detail__extras", { "grid-area": "extras", "z-index": 1000 }];
  }

  async scrape() {
    const product = JSON.parse(document.querySelector("#formProductAddToBasket").dataset.product);
    const itemId = product.id;
    const title = product.name;
    const currentPrice = cleanPrice("#priceSellingVat");
    const originalPrice = cleanPrice("#productOldPrice");
    const imageUrl = product.photoFile;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new ForCamping(), "4camping_cz", "4camping_sk");
