import { registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Albert extends AsyncShop {
  selector = `main>script[type='application/ld+json']`;

  get injectionPoint() {
    return ["afterend", `[data-testid=product-properties]`];
  }

  get waitForSelector() {
    return "[data-testid=price-wrapper]";
  }

  async scrape() {
    const data = JSON.parse(document.querySelector(this.selector).textContent);
    if (!data) return;
    const itemId = data.url.split("/").at(-1);
    const title = data.name;
    const currentPrice = toCZK(document.querySelector("[data-testid=price-wrapper]").textContent);
    const originalPrice = data.offers.priceSpecification.price;
    const imageUrl = data.image[0];
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

function toCZK(price) {
  if (!price) return null;
  return parseFloat((price / 100).toFixed(2));
}

registerShop(new Albert(), "albert_cz");
