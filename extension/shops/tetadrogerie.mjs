import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class Tetadrogerie extends Shop {
  inject(renderMarkup) {
    let elem = document.querySelector(".sx-detail-footer");
    if (!elem) throw new Error("Element to add chart not found");

    const styles = {
      margin: "0px, 0px",
      padding: "16px 0px"
    };
    const markup = renderMarkup(styles);
    elem.insertAdjacentElement("beforebegin", markup);
    return elem;
  }

  async scrape() {
    const elem = document.querySelector("#product-overview");
    if (!elem) return;
    const product = elem.querySelector(".j-product");
    const itemId = product.attributes["data-skuid"].textContent;
    const title = product.querySelector(".sx-detail-product-name").innerText;
    const actionPrice = cleanPrice(".sx-detail-price-action");
    const initialPrice = cleanPrice(".sx-detail-price-initial");
    const originalPrice = actionPrice ? initialPrice / 100 : null;
    const currentPrice = actionPrice ? actionPrice / 100 : initialPrice / 100;
    const cssDesktopImageUrl = document.querySelector(
      ".zoomWindowContainer .zoomWindow"
    );
    const cssMobileImageUrl = document.querySelector(".j-gallery-image");
    const finalImageUrl = cssDesktopImageUrl
      ? cssDesktopImageUrl.style.backgroundImage
      : cssMobileImageUrl.style.backgroundImage;
    const imageUrl = finalImageUrl.substring(4, finalImageUrl.length - 1);
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Tetadrogerie(), "tetadrogerie_cz");
