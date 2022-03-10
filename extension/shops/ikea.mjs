import { cleanPrice, cleanUnitPrice, isUnitPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Ikea extends Shop {

  get injectionPoint() {
    return ["afterend", ".pip-product-availability"];
  }

  async scrape() {
    const elem = document.querySelector("#content .product-pip");
    if (!elem) return;

    const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[1];
    if (jsonld) {
      try {
        const data = JSON.parse(jsonld.innerText);
        let originalPrice, currentPrice;
        if(data.offers["@type"] === "Offer"){
          originalPrice = null;
          currentPrice = data.offers.price;
        } else if(data.offers["@type"] === "AggregateOffer"){
          originalPrice = data.offers.highPrice;
          currentPrice = data.offers.lowPrice;
        }
        return {
          itemId: data.sku.replaceAll(".", ""),
          title: data.name,
          currentPrice,
          originalPrice,
          imageUrl: data.image[0]
        };
      } catch (e) {
        console.error("Could not find product info", e);
      }
    }
  }
}

registerShop(new Ikea(), "ikea_cz", "ikea_sk");
