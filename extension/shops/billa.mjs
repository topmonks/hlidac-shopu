import { registerShop, cleanPriceText, cleanPrice } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Billa extends AsyncShop {
  selector = "script[type='application/ld+json']:not([data-hid])";

  get injectionPoint() {
    return ["beforeend", ".ws-product-actions-wrapper"];
  }

  get waitForSelector() {
    return `${this.selector}, .ws-dialog__content .ws-product-actions-wrapper`;
  }

  async scrape() {
    const structuredData = document.querySelector(this.selector);
    if (structuredData) {
      const data = JSON.parse(structuredData.textContent);
      if (!data) return;
      const itemId = data.sku.replace("-", "");
      const title = data.name;
      const [,priceType, price] = document.querySelector(".ws-product-price-type>.caption")?.textContent.trim().split(" ");
      const currentPrice = priceType === "ks" ? data.offers.price : cleanPriceText(price);
      const imageUrl = data.image[0];
      return { itemId, title, currentPrice, imageUrl };
    }
    const dialog = document.querySelector(".ws-dialog__content");
    if (!dialog) return;
    const params = new URLSearchParams(location.search);
    const itemId= params.get("slug").split("-").at(-1);
    const url = new URL(`/produkt/${params.get("slug")}`, location.href).href;
    const title = dialog.querySelector(".ws-dialog-product-quick-view__title").textContent.trim();
    const [,priceType, price] = dialog.querySelector(".ws-product-price-type>.caption")?.textContent.trim().split(" ");
    const currentPrice = priceType === "ks" ? cleanPriceText(dialog.querySelector(".ws-product-price-type__value").textContent) : cleanPriceText(price);
    return { itemId, title, currentPrice, url };
   }
}

registerShop(new Billa(), "billa_cz");
