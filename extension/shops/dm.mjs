import { registerShop, cleanPriceText } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Dm extends AsyncShop {
  selector = "#dm-view [data-dmid='detail-availability-container']";

  get injectionPoint() {
    return ["beforeend", this.selector];
  }

  get waitForSelector() {
    return this.selector;
  }

  async scrape() {
    const data = JSON.parse(
      document.querySelector("[type='application/ld+json']").textContent
    );
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
