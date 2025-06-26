import {registerShop} from "../helpers.mjs";
import {Shop} from "./shop.mjs";

export class Hornbach extends Shop {
  get injectionPoint() {
    return ["afterend", `section[data-testid="product-informations"]`];
  }

  async scrape() {
    const allDocumentScripts = Array.from(document.querySelectorAll("script"));
    const string = allDocumentScripts
      .find(script => script.innerText.startsWith("window.pushTrackingInfo")).innerText

    const startIndex = string.indexOf("{");
    const endIndex = string.lastIndexOf("}") + 1;

    const jsonString = string.substring(startIndex, endIndex);
    const data = JSON.parse(jsonString);

    return {
      itemId: data["product.sku"],
      title: data["page.title"],
      currentPrice: parseFloat(data["product.defaultPrice.value"]),
      originalPrice: null,
      imageUrl: data["product.assets.thumbnail"]
    };
  }
}

registerShop(new Hornbach(), "hornbach_cz", "hornbach_sk");
