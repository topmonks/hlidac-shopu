import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class AAAAuto extends Shop {
  async scrape() {
    const url = new URL(location.href);
    const itemId = url.searchParams.get("id");
    if (!itemId) return false;
    const imageUrl = document.querySelector("meta[name='og:image']").content;

    // eng variant
    const engTabCard = document.querySelector("#tab-card");
    if (engTabCard) {
      const title = engTabCard.querySelector("h1").textContent;
      const priceRows = engTabCard.querySelectorAll("#priceTable .priceRow");
      let currentPrice;
      if (priceRows.length === 2) {
        currentPrice = cleanPrice(
          engTabCard.querySelector("#priceTable .carPrice span")
        );
      } else {
        currentPrice = cleanPrice(
          engTabCard.querySelector("#priceTable .priceRow:last-child span")
        );
      }

      const originalPrice = null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    const title = document.querySelector("#carCardHead h1").innerText;
    const price = document.querySelector(`
      .sidebar ul.infoBoxNav li:not([style]):not([class]) span.notranslate,
      .sidebar ul.infoBoxNav .fixedBarScrollHide span.notranslate,
      .sidebar ul.infoBoxNav .infoBoxNavTitle span.notranslate
    `);
    const originalPrice =
      price && price.hasChildNodes() ? cleanPrice(price.firstChild) : null;
    const currentPrice =
      price && price.hasChildNodes()
        ? cleanPrice(price.lastChild)
        : cleanPrice(price);

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  inject(renderMarkup) {
    let elem = document.querySelector("#testdrive-button");
    if (elem) {
      const markup = renderMarkup();
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
