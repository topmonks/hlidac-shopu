import { cleanPrice, cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

/**
 * Brand promotions ("29 Kč s akcí: Sleva 25 %", SK "56,70 € s akciou") are applied in the
 * cart for everyone, so their price is what the shopper pays. Conditional promotions
 * ("nad 2 ks", "nad 690 Kč", "2+1 ZADARMO") have no per-product price and are skipped, as are
 * club-only prices. Mirrors the pilulka-daily actor.
 * @param {Element} productEl
 * @returns {string|null}
 */
function promoPrice(productEl) {
  for (const item of productEl.querySelectorAll(".service-detail__main .giftEvents__item")) {
    if (/pro\s+členy|pre\s+členov/i.test(item.textContent)) continue;
    const tag = item.querySelector(".giftEvents__title-tag")?.textContent ?? "";
    const match = tag.match(/([\d\s,.]+)\s*(?:Kč|€)\s*s\s+akc[ií]/i);
    if (match) return cleanPriceText(match[1]);
  }
  return null;
}

export class Pilulka extends AsyncShop {
  get waitForSelector() {
    return "[componentname='catalog.product']";
  }

  get injectionPoint() {
    // Limitation: discontinued/non-purchasable products can miss `ul.usp`
    // (e.g. https://www.pilulka.cz/indulona-original-85ml).
    return ["afterend", "ul.usp"];
  }

  async scrape() {
    try {
      const productEl = document.querySelector("[componentname='catalog.product']");
      if (!productEl) return null;

      const itemId = productEl.id;
      const title = productEl.querySelector(".service-detail__main .service-detail__title")?.title;
      const isWowDiscount = productEl.querySelector(".product-price-container .product-card-price__special-box");
      const listPrice = cleanPrice(
        isWowDiscount
          ? `.service-detail__main .product-price-container .product-card-price__prices b`
          : `.service-detail__main .product-price-container .product-card-price__prices`
      );
      const oldPrice = cleanPrice(`.service-detail__main .product-price-container .product-card-price__old`);
      const couponPrice = promoPrice(productEl);
      const currentPrice = couponPrice ?? listPrice;
      const originalPrice = couponPrice ? (oldPrice ?? listPrice) : oldPrice;
      const imageUrl = document.querySelector(".service-detail__main-link")?.href;

      if (!itemId || !title) return null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    } catch (err) {
      console.error("Error in scrape():", err);
      return null;
    }
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
