import { registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Globus migrated from iglobus.cz to globusonline.cz with a Next.js SPA
// rewrite. None of the old selectors (.product-configurator, .money-price)
// exist anymore — the only stable anchor is the ProductPrice component.
// The detail price no longer lives inside ProductDetailInfo; it is the only
// ProductPrice on the page that is not wrapped in a product-tile link.
const detailSelector = '[data-sentry-component="ProductDetailInfo"]';
const priceSelector = '[data-sentry-component="ProductPrice"]:not(a [data-sentry-component="ProductPrice"])';

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
    return { itemId, title, currentPrice, originalPrice: null, imageUrl };
  }
}

registerShop(new Globus(), "iglobus", "globus_cz", "globusonline_cz");
