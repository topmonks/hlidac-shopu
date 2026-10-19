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

// coupon price ("se slevovým kódem") is the current price, the crossed-out price stays the original one
// (the pre-coupon price when there is none), same as the 4camping actor; without a coupon the voucher block shows 0
function prices({ price, oldPrice, couponPrice }) {
  const originalPrice = discountedFrom(oldPrice, price);
  if (Number(couponPrice) > 0 && Number(couponPrice) < Number(price)) {
    return { currentPrice: couponPrice, originalPrice: originalPrice ?? price };
  }
  return { currentPrice: price, originalPrice };
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
        ...prices({
          price: variant.price,
          oldPrice: variant.priceOld,
          // HTML like `4&nbsp;049&nbsp;<span class="currency">Kč</span>`
          couponPrice: cleanPriceText(
            variant.voucher?.priceWithVoucherDiscountFormatted?.replace(/<[^>]*>|&nbsp;|\.(?=\d{3}\b)/g, "") ?? ""
          )
        }),
        imageUrl: variant.photoFilename ?? product.photoFile
      };
    }
    const itemId = product.id;
    const title = product.name;
    const { currentPrice, originalPrice } = prices({
      price: cleanPrice("#priceSellingVat"),
      oldPrice: cleanPrice("#productOldPrice"),
      couponPrice: cleanPrice("#priceWithDiscount")
    });
    const imageUrl = product.photoFile;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new ForCamping(), "4camping_cz", "4camping_sk");
