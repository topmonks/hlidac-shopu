import { cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Dm extends AsyncShop {
  get waitForSelector() {
    return "[data-dmid=detail-availability-container]";
  }

  get injectionPoint() {
    return ["beforebegin", "[data-dmid=detail-availability-container]"];
  }

  async scrape() {
    const script = document.querySelector("script[type='application/ld+json'][data-source=composing-ui]");
    if (!script) return;
    const data = JSON.parse(script.textContent);
    if (!data) return;
    const itemId = data.gtin ?? data.sku;
    const title = data.name;
    const currentPrice = data.offers?.price;
    const originalPrice = cleanPriceText(
      document.querySelector('[data-dmid="price-sellout"]')?.textContent?.trim() ?? ""
    );
    const imageUrl = data.image;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Dm(), "dm_cz", "mojadm_sk");
