import { registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Albert extends StatefulShop {
  get detailSelector() {
    return ":has([data-testid=product-block-price])";
  }

  shouldRender(mutations) {
    return Boolean(mutations.find(x => x.target.dataset.testid === "product-carousel"));
  }

  shouldCleanup(mutations) {
    return Boolean(mutations.find(x => Array.from(x.removedNodes).find(y => y.id === "product-details-seo-data")));
  }

  get injectionPoint() {
    return ["afterend", `[data-testid=product-properties]`];
  }

  async scrape() {
    const data = JSON.parse(document.querySelector("#product-details-seo-data").textContent);
    if (!data) return;
    const itemId = data.url.split("/").at(-1);
    const title = data.name;
    const currentPrice = toCZK(document.querySelector("[data-testid=product-block-price]").textContent);
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
