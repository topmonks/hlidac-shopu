import { cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Knihydobrovsky extends Shop {
  get injectionPoint() {
    const elem = document.querySelector("#snippet--deliveryInfo .variants");
    if (elem) {
      return ["afterend", "#snippet--deliveryInfo .variants"];
    }
    return ["afterend", "#snippet--deliveryInfo .b-gift"];
  }

  async scrape() {
    const elem = document.querySelector(".box-product");
    if (!elem) return;

    const priceBefore = cleanPriceText(
      elem.querySelector(".box-std .price-before")?.textContent?.split(":")?.at(-1)?.trim() ?? ""
    );

    const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[1];
    const isFree = document.querySelector("p.price strong")?.innerText?.trim()?.toLowerCase() === "zdarma";
    if (jsonld) {
      try {
        const data = JSON.parse(jsonld.innerText);
        return {
          itemId: data.sku,
          title: data.name,
          currentPrice: isFree ? 0 : data.offers.price, // data always have previous price even if it's free now
          originalPrice: priceBefore ? parseInt(priceBefore) : null,
          imageUrl: data.image[0]
        };
      } catch (e) {
        console.error("Could not find product info", e);
      }
    }
  }
}

registerShop(new Knihydobrovsky(), "knihydobrovsky_cz");
