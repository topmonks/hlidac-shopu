import { registerShop, cleanPriceText } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Dm extends AsyncShop {
  selector = `script[type='application/ld+json'][data-source=composing-ui]`;

  get injectionPoint() {
    return ["afterend", `[data-dmid=add-to-cart-with-quantity-form]`];
  }

  get waitForSelector() {
    return this.selector;
  }

  async scrape() {
    const data = JSON.parse(document.querySelector(this.selector).textContent);
    if (!data) return;
    const itemId = data.gtin ?? data.sku;
    const title = data.name;
    const currentPrice = data.offers.price;
    const originalPrice = cleanPriceText(
      document
        .querySelector('[data-dmid="price-sellout"]')
        ?.textContent?.trim() ?? ""
    );
    const imageUrl = data.image;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Dm(), "dm_cz", "mojadm_sk");
