import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class TetaDrogerie extends Shop {
  get injectionPoint() {
    return [
      "beforeend",
      ".sx-detail-overview",
      {
        margin: 0,
        padding: "16px 0px"
      }
    ];
  }

  async scrape() {
    const elem = document.querySelector("#product-overview");
    if (!elem) return;
    const product = elem.querySelector(".j-product");
    const itemId = product.dataset.skuid;
    const title = product.querySelector(".sx-detail-product-name").innerText;
    const offerPrice = cleanPrice(".sx-detail-offer-valid-to .sx-sale-w-arrow-container");
    const actionPrice = cleanPrice(".sx-detail-price-action");
    const initialPrice = cleanPrice(".sx-detail-price-initial");
    const originalPrice = offerPrice ?? (actionPrice ? initialPrice / 100 : null);
    const currentPrice = actionPrice ? actionPrice / 100 : initialPrice / 100;
    const cssDesktopImageUrl = document.querySelector(".zoomWindowContainer .zoomWindow");
    const cssMobileImageUrl = document.querySelector(".j-gallery-image");
    const finalImageUrl = cssDesktopImageUrl
      ? cssDesktopImageUrl.style.backgroundImage
      : cssMobileImageUrl.style.backgroundImage;
    const imageUrl = finalImageUrl.substring(4, finalImageUrl.length - 1);
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new TetaDrogerie(), "tetadrogerie_cz");
