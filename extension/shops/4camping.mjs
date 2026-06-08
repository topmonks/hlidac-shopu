import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class ForCamping extends AsyncShop {
  get waitForSelector() {
    return "#id_98";
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
