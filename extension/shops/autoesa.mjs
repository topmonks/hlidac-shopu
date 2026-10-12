import { cleanPriceText, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

/**
 * The car header lists its prices as labelled items. The autoesa actor stores the cash price
 * ("Cena v hotovosti") and the crossed-out "Původní cena"; "Akční cena na úvěr" is a financed
 * price and "Měsíčně od" an instalment, so neither is a current or former price.
 * @param {Element} header
 * @param {string} label
 * @returns {string|null}
 */
function labelledPrice(header, label) {
  for (const item of header.querySelectorAll(".car_prices__item")) {
    if (item.querySelector(".car_prices__item__title")?.textContent.includes(label)) {
      return cleanPriceText(item.querySelector("strong")?.textContent);
    }
  }
  return null;
}

export class AutoEsa extends Shop {
  get injectionPoint() {
    return ["afterend", ".car_detail2__header .car_buttons"];
  }

  async scrape() {
    const header = document.querySelector(".car_detail2__header");
    if (!header) return;

    // Car detail is /{make}/{model}/{body}/{fuel}/{id}; lib/shops.mjs and the actor use the id.
    const itemId = location.pathname.split("/").at(-1);
    const currentPrice = labelledPrice(header, "Cena v hotovosti");
    if (!/^\d+$/.test(itemId) || !currentPrice) return;

    // The page keeps a hidden copy of the header whose h1 carries the full model name the actor
    // records; the visible h1 has only make, model and year.
    const title =
      document.querySelector(".car_detail2__h1 h1")?.textContent.replace(/\s+/g, " ").trim() ??
      header.querySelector("h1")?.innerText.trim();
    const imageUrl = document.querySelector("meta[property='og:image']")?.content;
    const originalPrice = labelledPrice(header, "Původní cena");

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new AutoEsa(), "autoesa_cz");
