import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Pilulka extends AsyncShop {
  get injectionPoint() {
    return ["afterend", ".service-detail__basket-box"];
  }

  get waitForSelector() {
    return ".service-detail__basket-box";
  }

  async scrape() {
    const data = JSON.parse(document.querySelector("script[type='application/ld+json']").textContent);
    const product = data.find(x => x["@type"] === "Product");
    const title = product?.name;
    const itemId = document.querySelector("[componentname='catalog.product']").id;
    const currentPrice = product?.offers?.price;
    const originalPrice = cleanPrice(`.price-before, .superPrice__old__price`);
    const imageUrl = product?.image?.[0];

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
