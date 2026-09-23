import { cleanPrice, cleanUnitPrice, getItemIdFromUrl, isUnitPrice, registerShop } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

const injectionTargets = [
  ["beforeend", '#productDetail div[data-test="product-detail-upper-section"] > div:last-child'],
  ["afterend", '#productDetail [data-test="product-detail-price-section"]']
];

// Rohlik opens products from search suggestions in a modal overlay
// (.product_detail_modal) WITHOUT changing the page URL, so the URL and the
// page-level JSON-LD still describe the underlying product (#910). Whenever
// the modal is open, all scraping and injection must be scoped to the
// modal's own #productDetail and the URL/JSON-LD sources must be ignored.
const productModal = () => document.querySelector(".product_detail_modal");
const detailRoot = () => productModal()?.querySelector("#productDetail") ?? document.querySelector("#productDetail");

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

const textFrom = (selector, root = document) => root.querySelector(selector)?.textContent?.trim();

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

const cleanOriginalPrice = root => {
  const elem =
    root.querySelector('[data-test="product-detail-price-section-sale"]') ??
    root.querySelector('[data-test="product-in-sale-original"] del') ??
    root.querySelector("del");
  if (!elem) return null;

  if (isUnitPrice(elem)) {
    const quantity = cleanPrice(root.querySelector(".detailQuantity"));
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
    // Scope injection to the modal when it is open, so the widget lands in
    // the popup product's detail and not the underlying page's (#910).
    const prefix = productModal() ? ".product_detail_modal " : "";
    for (const [position, selector] of injectionTargets) {
      const elem = document.querySelector(prefix + selector);
      if (!elem) continue;
      elem.insertAdjacentElement(position, renderMarkup());
      return elem;
    }
    throw new Error(
      `Element to add chart not found; selectors: ${injectionTargets.map(([, selector]) => selector).join(", ")}`
    );
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    const tryRender = async () => {
      const info = await this.scrape();
      if (!info) return;
      const data = await fetchData(info);
      if (!data) return;
      render(false, data);
    };
    new MutationObserver(async mutations => {
      // Closing the popup and re-rendering the page detail arrive in the same
      // mutation batch, so handle them as one case to render only once.
      const closedPopup = this.shouldCleanup(mutations);
      if (!closedPopup && !this.shouldRender(mutations)) return;
      // Remove the previous widget first: renderHTML re-injects only when the
      // root is disconnected, so it would otherwise stay anchored where it was
      // (e.g. hidden under an opened popup) while showing the new product.
      cleanup();
      // After a close this restores the underlying page's widget, which the
      // popup render displaced.
      if (document.querySelector(this.detailSelector)) await tryRender();
    }).observe(this.observerTarget, { subtree: true, childList: true });

    if (!document.querySelector(this.detailSelector)) return;
    await tryRender();
  }

  async scrape() {
    const inPopup = Boolean(productModal());
    const elem = detailRoot();
    if (!elem) return null;

    const originalPrice = cleanOriginalPrice(elem);
    // In the popup the URL, JSON-LD, document.title and og:image all still
    // belong to the underlying product — only the modal's DOM is reliable.
    const productLd = inPopup ? null : parseProductLd();
    const itemIdFromUrl = inPopup ? null : getItemIdFromUrl(new URL(window.location.href));

    const itemId = itemIdFromUrl ?? elem.querySelector("button[data-product-id]")?.dataset.productId ?? productLd?.sku;
    const title =
      textFrom('[data-test="product-detail-product-name"]', elem) ??
      textFrom("h1", elem) ??
      productLd?.name ??
      (inPopup ? null : document.title.split("-")[0].trim());
    const currentPrice =
      cleanRohlikPrice(
        elem.querySelector(
          // Xtra/Premium member prices are rendered as product-price when active.
          // premium-priceForPremiumInDetail is an inactive-sale upsell block.
          `[data-test="product-detail-price-section-priceNo"],
           [data-test="product-price"],
           .actionPrice,
           .currentPrice`
        )
      ) ?? priceFromProductLd(productLd);
    const imageUrl =
      elem.querySelector("[data-gtm-item=product-image] img")?.src ??
      (inPopup
        ? undefined
        : (document.querySelector('meta[property="og:image"]')?.content ?? imageFromProductLd(productLd)));

    if (!itemId || !title || !currentPrice) return null;
    // The API resolves the product from the URL, and in the popup
    // location.href still points at the underlying product.
    const url = inPopup ? `https://www.rohlik.cz/${itemId}` : undefined;
    return { itemId, title, currentPrice, originalPrice, imageUrl, url };
  }
}

registerShop(new Rohlik(), "rohlik");
