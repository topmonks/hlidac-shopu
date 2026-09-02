import { cleanPriceText, getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

/**
 * Redesigned aaaauto is an Angular SPA. Car detail lives at /detail/{make}/{model}/{id},
 * often with a routing hash appended; the old `?id=` param is gone.
 *
 * Price/name/image come from the page's schema.org JSON-LD rather than from selectors,
 * because there is no single markup to select against:
 * - .cz renders the current price block (`.detail-price-block__price--main`),
 * - .sk still renders the legacy one (`.price__amount--default`),
 * and neither survives as a stable contract. The JSON-LD `offers.price` is the cash
 * price on both - the same number the aaaauto-daily actor stores as `currentPrice` -
 * and Angular re-renders it on client-side navigation, which the server-side
 * `#ng-state` blob does not (it only holds the car loaded on first paint).
 */
/** @returns {{name: string, offers: {price: string}, image: string|string[]}|null} */
function jsonLdProduct() {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const graph = JSON.parse(script.textContent)["@graph"] ?? [];
      const product = graph.find(node => node.offers?.price);
      if (product) return product;
    } catch {
      // A malformed block must not stop us from reading the next one.
    }
  }
  return null;
}

export class AAAAuto extends AsyncShop {
  get injectionPoint() {
    // The price block sits in a flex row, so a sibling there gets squeezed; the
    // `.detail__header` wrapper is block-level, full width, and present in both templates.
    return ["afterend", ".detail__header"];
  }

  get waitForSelector() {
    return ".detail__header";
  }

  async scrape() {
    // Shares lib/shops.mjs, so the extension tracks the URL parser instead of copying it.
    const itemId = getItemIdFromUrl(new URL(location.href));
    if (!itemId) return null;

    const product = jsonLdProduct();
    if (!product) return null;

    // Angular pushes the new URL before it swaps the detail subtree, so on a client-side
    // detail -> detail hop the JSON-LD can still describe the previous car. Pairing that
    // price with this id would persist a wrong price server-side for 24h, so bail and let
    // the observer retry on the next mutation.
    if (!product.url?.endsWith(`/${itemId}`)) return null;

    const currentPrice = cleanPriceText(product.offers.price);
    if (!currentPrice) return null;

    // JSON-LD `name` is the clean car name; the page h1 appends the year in a nested span.
    const title = product.name ?? document.querySelector("h1")?.textContent.trim();
    const image = product.image;
    const imageUrl =
      (Array.isArray(image) ? image[0] : image) ?? document.querySelector("meta[property='og:image']")?.content;

    // No pre-discount price is published anywhere on the detail page. The second price
    // shown next to the main one ("Akční cena" / secondary) is the financed price, not a
    // former price - reporting it as originalPrice would invent a discount.
    return { itemId, title, currentPrice, originalPrice: null, imageUrl };
  }
}

registerShop(new AAAAuto(), "aaaauto", "aaaauto_sk");
