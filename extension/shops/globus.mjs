import { registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Globus migrated from iglobus.cz to globusonline.cz with a Next.js SPA
// rewrite. None of the old selectors (.product-configurator, .money-price)
// exist anymore — the only stable anchor is the ProductPrice component.
// The detail price no longer lives inside ProductDetailInfo; it is the only
// ProductPrice on the page that is not wrapped in a product-tile link.
const detailSelector = '[data-sentry-component="ProductDetailInfo"]';
const priceSelector = '[data-sentry-component="ProductPrice"]:not(a [data-sentry-component="ProductPrice"])';

// Prices render as crowns and cents in separate spans ("29" + "90"), so the
// plain textContent ("2990Kč") would parse as a 100× price.
function splittedPriceValue(el) {
  const [crowns, cents] = Array.from(el.querySelectorAll("span"))
    .map(span => span.textContent.trim())
    .filter(text => /^\d+$/.test(text));
  if (!crowns) return null;
  return cents ? `${crowns}.${cents}` : crowns;
}

// On a discount the detail price shows the pre-discount price as a
// SplittedPrice styled with the text-priceBefore token (struck through via
// a pseudo-element) next to the discounted one. The per-unit price below
// uses SplittedPrice too, so exclude it.
function originalPrice() {
  const before = Array.from(
    document.querySelectorAll(`${priceSelector} [data-sentry-component="SplittedPrice"].text-priceBefore`)
  ).find(el => !el.closest('[data-sentry-component="PerUnitPriceTag"]'));
  return before ? splittedPriceValue(before) : null;
}

function findProductLd() {
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      if (data?.["@type"] === "Product") return data;
    } catch {}
  }
  return null;
}

export class Globus extends AsyncShop {
  get waitForSelector() {
    return priceSelector;
  }

  get injectionPoint() {
    return ["afterend", priceSelector];
  }

  async scrape() {
    if (!document.querySelector(detailSelector)) return;

    // URL slug is the source of truth — matches both lib/shops.mjs's parser
    // and the server-side scraper's S3 key.
    const itemId = location.pathname.match(/^\/p\/([^/]+)/)?.[1];
    if (!itemId) return;

    const title = document.querySelector(`${detailSelector} h1`)?.textContent?.trim();
    const ld = findProductLd();
    const currentPrice = ld?.offers?.price ?? null;
    const imageUrl = ld?.image ?? document.querySelector('meta[property="og:image"]')?.content;
    return { itemId, title, currentPrice, originalPrice: originalPrice(), imageUrl };
  }
}

registerShop(new Globus(), "iglobus", "globus_cz", "globusonline_cz");
