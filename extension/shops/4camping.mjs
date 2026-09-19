import { cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// 4camping.sk formats prices like "1.200,41 €", drop the thousands separator dots
function cleanPrice(selector) {
  return cleanPriceText(document.querySelector(selector)?.textContent.replace(/\.(?=\d{3}\b)/g, ""));
}

// 4camping keeps the old price box in the page even when there is no discount,
// sometimes with a price lower than the current one
function discountedFrom(originalPrice, currentPrice) {
  return Number(originalPrice) > Number(currentPrice) ? originalPrice : null;
}

// inline `var data = {...}` holds all variants of the product
function productDetailData() {
  const script = Array.from(document.querySelectorAll("script"), x => x.textContent).find(x =>
    x.includes("var data = ")
  );
  if (!script) return null;
  const json = script.slice(script.indexOf("var data = ") + "var data = ".length, script.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

// selected variant is in url hash as variant slug `#43-zelena`, or as variant id `#1103703`
function selectedVariant() {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  const variants = productDetailData()?.variantsInfo ?? {};
  return Object.values(variants).find(x => x.url.split("/").filter(Boolean).at(-1) === hash) ?? variants[hash] ?? null;
}

export class ForCamping extends AsyncShop {
  get waitForSelector() {
    return "#formProductAddToBasket";
  }

  get injectionPoint() {
    return ["beforebegin", "#priceInfo>.product-detail__extras", { "grid-area": "extras", "z-index": 1000 }];
  }

  async scrape() {
    const product = JSON.parse(document.querySelector("#formProductAddToBasket").dataset.product);
    const variant = selectedVariant();
    if (variant) {
      return {
        // same id as 4camping uses in its analytics for a selected variant
        itemId: `${product.id}-${variant.id}`,
        title: variant.productNameWithVariant,
        currentPrice: variant.price,
        originalPrice: discountedFrom(variant.priceOld, variant.price),
        imageUrl: variant.photoFilename ?? product.photoFile
      };
    }
    const itemId = product.id;
    const title = product.name;
    const currentPrice = cleanPrice("#priceSellingVat");
    const originalPrice = discountedFrom(cleanPrice("#productOldPrice"), currentPrice);
    const imageUrl = product.photoFile;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new ForCamping(), "4camping_cz", "4camping_sk");
