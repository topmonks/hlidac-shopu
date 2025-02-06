import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class AAAAuto extends Shop {
  async scrape() {
    const url = new URL(location.href);
    const itemId = url.searchParams.get("id");
    if (!itemId) return;
    const imageUrl = document.querySelector("meta[property='og:image']")?.content;

    // eng variant
    const engTabCard = document.querySelector("#tab-card");
    if (engTabCard) {
      const title = engTabCard.querySelector("h1").textContent;
      const priceRows = engTabCard.querySelectorAll("#priceTable .priceRow");
      let currentPrice;
      if (priceRows.length === 2) {
        currentPrice = cleanPrice(engTabCard.querySelector("#priceTable .carPrice span"));
      } else {
        currentPrice = cleanPrice(engTabCard.querySelector("#priceTable .priceRow:last-child span"));
      }

      const originalPrice = null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }

    const title = document.querySelector(".carCard__name h1")?.innerText.trim().replaceAll(/\s+/g, " ");
    const originalPrice = cleanPrice(document.querySelector(".carCard__price-item s"));
    const currentPrice = cleanPrice(document.querySelector(".carCard__price-value:not(.secondary)"));
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    let elem = document.querySelector(".carCard__head");
    if (elem) {
      const markup = renderMarkup({
        "max-width": "640px",
        margin: "2em auto"
      });
      elem.insertAdjacentElement("afterend", markup);
      return elem;
    }

    // eng variant
    elem = document.querySelector("#carButtons .testdrive-bonus");
    if (!elem) throw new Error("Element to add chart not found");

    const table = document.querySelector("#carButtons table");
    table.style.position = "relative";
    const markup = renderMarkup();
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}

registerShop(new AAAAuto(), "aaaauto", "aaaauto_sk");
