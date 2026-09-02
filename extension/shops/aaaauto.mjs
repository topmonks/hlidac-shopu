import { cleanPriceText, getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

/**
 * Redesigned aaaauto is an Angular SPA; detail is /detail/{make}/{model}/{id}, no more `?id=`.
 * Price/name/image come from the schema.org JSON-LD because the price markup varies by
 * rollout bucket (`.detail-price-block__price--main` vs the legacy `.price__amount--default`,
 * seen on both TLDs), while `offers.price` is the cash price everywhere - the same number
 * the aaaauto-daily actor stores. See "Redesigns That Change the Product URL" in
 * actors/AGENT.md for the slug contract this feeds.
 */
/** @returns {{name: string, offers: {price: string}, image: string|string[]}|null} */
function jsonLdProduct() {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      // Both TLDs ship an @graph today; a flat or array-rooted block is still valid JSON-LD.
      const graph = data["@graph"] ?? (Array.isArray(data) ? data : [data]);
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
    // A sibling of the price block gets squeezed by its flex row; `.detail__header` is
    // block-level and present in both buckets. Width capped as before the redesign.
    return ["afterend", ".detail__header", { "max-width": "640px", margin: "2em auto" }];
  }

  get waitForSelector() {
    return ".detail__header";
  }

  async scrape() {
    // Shares lib/shops.mjs, so the extension tracks the URL parser instead of copying it.
    const itemId = getItemIdFromUrl(location);
    if (!itemId) return null;

    const product = jsonLdProduct();
    if (!product) return null;

    // Angular pushes the new URL before swapping the subtree, so after a detail -> detail
    // hop the JSON-LD may still describe the previous car; a mis-paired price is persisted
    // server-side for 24h. Compare through the same parser so a trailing slash or a query
    // on the canonical url cannot silently reject every car. Bail and let the observer retry.
    if (getItemIdFromUrl(new URL(product.url ?? "", location.href)) !== itemId) return null;

    // String(): schema.org allows a numeric price, and cleanPriceText calls .replace on it.
    const currentPrice = cleanPriceText(String(product.offers.price));
    if (!currentPrice) return null;

    // JSON-LD `name` is the clean car name; the page h1 appends the year in a nested span.
    const title = product.name ?? document.querySelector("h1")?.textContent.trim();
    const image = product.image;
    const imageUrl =
      (Array.isArray(image) ? image[0] : image) ?? document.querySelector("meta[property='og:image']")?.content;

    // The second price on the page ("Akční cena" / secondary) is the financed price, not a
    // former price, and no pre-discount price is published - so originalPrice stays null.
    return { itemId, title, currentPrice, originalPrice: null, imageUrl };
  }
}

registerShop(new AAAAuto(), "aaaauto", "aaaauto_sk");
