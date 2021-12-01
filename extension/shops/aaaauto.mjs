import {cleanPrice, cleanPriceText, registerShop} from "../helpers.mjs";
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
    const price = document.querySelectorAll(`
      .sidebar ul.infoBoxNav li:not([style]):not([class]),
      .sidebar ul.infoBoxNav .fixedBarScrollHide,
      .sidebar ul.infoBoxNav .infoBoxNavTitle
    `);
    let originalPrice = null;
    let currentPrice = null;
    for (const p of price) {
      if (p.textContent.includes('Cena')) {
        let strikePrice = p.querySelector('span.notranslate s');
        if (strikePrice) {
          strikePrice = p.querySelector('span.notranslate');
          originalPrice = cleanPriceText(strikePrice.childNodes[0].textContent);
          currentPrice = cleanPriceText(strikePrice.childNodes[1].textContent);
        } else {
          currentPrice = cleanPriceText(p.textContent);
        }
      }
    }

    console.log(originalPrice);
    console.log(`currentPrice ${currentPrice}`)
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
