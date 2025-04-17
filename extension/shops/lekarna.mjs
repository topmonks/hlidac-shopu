import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Lekarna extends Shop {
  get injectionPoint() {
    return ["afterend", "#priceBox"];
  }

  async scrape() {
    const el = document.querySelector("#snippet-structuredData-structuredData-default");
    if (!el) return null;

    const data = JSON.parse(el.textContent);
    console.log(data);

    const itemId = data.sku;
    const title = data.name;
    const currentPrice = data.offers.price;
    const originalPrice = cleanPrice("#priceBox.line-through");
    const imageUrl = document.querySelector("[property='og:image']")?.content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Lekarna(), "lekarna");
