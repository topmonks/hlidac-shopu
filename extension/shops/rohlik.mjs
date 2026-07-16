import { cleanPrice, cleanUnitPrice, getItemIdFromUrl, isUnitPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const injectionTargets = [
  ["beforeend", '#productDetail div[data-test="product-detail-upper-section"] > div:last-child'],
  ["afterend", '#productDetail [data-test="product-detail-price-section"]']
];

const didRenderDetail = mutations =>
  mutations.find(x =>
    Array.from(x.addedNodes).find(
      y =>
        y.id === "productDetail" ||
        y.querySelector?.("#productDetail") ||
        y.querySelector?.('[data-test="product-detail-upper-section"]')
    )
  );

const isProductLd = data => {
  const type = data?.["@type"];
  return type === "Product" || (Array.isArray(type) && type.includes("Product"));
};

const findProductLd = data => {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(findProductLd).find(Boolean) ?? null;
  if (isProductLd(data)) return data;
  if (data["@graph"]) return findProductLd(data["@graph"]);
  return null;
};

const parseProductLd = () => {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const product = findProductLd(JSON.parse(script.textContent));
      if (product) return product;
    } catch {}
  }
  return null;
};

const priceFromProductLd = product => {
  const offers = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const price = offers?.price ?? offers?.lowPrice;
  if (price === undefined || price === null) return null;

  const number = Number(String(price).replace(",", "."));
  return Number.isFinite(number) ? number.toFixed(2) : String(price);
};

const imageFromProductLd = product => {
  const image = Array.isArray(product?.image) ? product.image[0] : product?.image;
  if (!image) return undefined;
  if (typeof image !== "string") return image.url;
  if (image.startsWith("http")) return image;
  if (image.startsWith("//")) return `${location.protocol}${image}`;
  if (image.startsWith("/"))
    return `https://www.rohlik.cz/cdn-cgi/image/f=auto,w=500,h=500/https://cdn.rohlik.cz${image}`;
  return image;
};

const textFrom = selector => document.querySelector(selector)?.textContent?.trim();

const cleanRohlikPrice = selector => {
  const elem = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!elem) return null;

  const cents = elem.querySelector("sup")?.textContent?.replace(/\D/g, "");
  if (cents) {
    // Cents live in a <sup>; parse the crowns from the rest of the element.
    // Do not fall back to cleanPrice(elem) here — it would include the sup
    // digits and yield a 100× price (e.g. "2990" instead of "29.90").
    const withoutCents = elem.cloneNode(true);
    withoutCents.querySelectorAll("sup").forEach(x => x.remove());
    const crowns = cleanPrice(withoutCents);
    return crowns ? `${crowns}.${cents.slice(0, 2).padEnd(2, "0")}` : null;
  }

  return cleanPrice(elem);
};

const cleanOriginalPrice = () => {
  const elem =
    document.querySelector('#productDetail [data-test="product-detail-price-section-sale"]') ??
    document.querySelector('#productDetail [data-test="product-in-sale-original"] del') ??
    document.querySelector("#productDetail del");
  if (!elem) return null;

  if (isUnitPrice(elem)) {
    const quantity = cleanPrice("#productDetail .detailQuantity");
    if (quantity) return cleanUnitPrice(elem, quantity);
  }

  return cleanRohlikPrice(elem);
};

export class Rohlik extends StatefulShop {
  get injectionPoint() {
    return injectionTargets[0];
  }

  get detailSelector() {
    return "#productDetail";
  }

  get observerTarget() {
    return document.querySelector("#__next");
  }

  shouldRender(mutations) {
    return didRenderDetail(mutations);
  }

  shouldCleanup(mutations) {
    return this.didMutate(mutations, "removedNodes", "product_detail_modal");
  }

  inject(renderMarkup) {
    for (const [position, selector] of injectionTargets) {
      const elem = document.querySelector(selector);
      if (!elem) continue;
      elem.insertAdjacentElement(position, renderMarkup());
      return elem;
    }
    throw new Error(
      `Element to add chart not found; selectors: ${injectionTargets.map(([, selector]) => selector).join(", ")}`
    );
  }

  async scrape() {
    const elem = document.querySelector("#productDetail");
    if (!elem) return null;

    const url = new URL(window.location.href);
    const originalPrice = cleanOriginalPrice();
    const productLd = parseProductLd();
    const itemIdFromUrl = getItemIdFromUrl(url);

    const itemId = itemIdFromUrl ?? elem.querySelector("button[data-product-id]")?.dataset.productId ?? productLd?.sku;
    const title =
      textFrom('#productDetail [data-test="product-detail-product-name"]') ??
      textFrom("#productDetail h1") ??
      productLd?.name ??
      document.title.split("-")[0].trim();
    const currentPrice =
      cleanRohlikPrice(
        // Xtra/Premium member prices are rendered as product-price when active.
        // premium-priceForPremiumInDetail is an inactive-sale upsell block.
        `#productDetail [data-test="product-detail-price-section-priceNo"],
         #productDetail [data-test="product-price"],
         #productDetail .actionPrice,
         #productDetail .currentPrice`
      ) ?? priceFromProductLd(productLd);
    const imageUrl =
      elem.querySelector("[data-gtm-item=product-image] img")?.src ??
      document.querySelector('meta[property="og:image"]')?.content ??
      imageFromProductLd(productLd);

    if (!itemId || !title || !currentPrice) return null;
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Rohlik(), "rohlik");
