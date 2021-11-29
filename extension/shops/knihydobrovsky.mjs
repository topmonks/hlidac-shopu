import { cleanPrice, cleanUnitPrice, isUnitPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Knihydobrovsky extends Shop {

  get injectionPoint() {
    return ["afterend", "#snippet-bookDetail-availabilityInfo"];
  }

  async scrape() {
    const elem = document.querySelector(".box-product");
    if (!elem) return;

    const originalPrice = parseFloat(cleanPrice(elem.querySelector(".price .discount")));
    const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[1];
    if (jsonld) {
      try {
        const data = JSON.parse(jsonld.innerText);
        return {
          itemId: data.sku,
          title: data.name,
          currentPrice: data.offers.price,
          originalPrice: originalPrice + data.offers.price,
          imageUrl: data.image[0]
        };
      } catch (e) {
        console.error("Could not find product info", e);
      }
    }
  }
}

registerShop(new Knihydobrovsky(), "knihydobrovsky_cz");
