import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class ForCamping extends AsyncShop {
  get waitForSelector() {
    return "#id_98";
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

  inject(renderMarkup) {
    const el = document.querySelector("#priceInfo>.product-detail__extras");
    if (!el) return;
    const markup = renderMarkup({ "grid-area": "extras" });
    el.insertAdjacentElement("beforebegin", markup);
    return el;
  }
}

registerShop(new ForCamping(), "4camping_cz", "4camping_sk");
