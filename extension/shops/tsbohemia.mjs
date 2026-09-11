import { registerShop, waitForHydration } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// TSBohemia is a Next.js SPA. Prices are read from the detail page's schema.org
// `Product` block (SalePrice -> current, RegularPrice -> original, the latter
// only when discounted) because the rendered price block hydrates client-side
// and its BEM classes are shared with the listing tiles.
export class TsBohemia extends AsyncShop {
  get waitForSelector() {
    return ".product-detail__price-values";
  }

  get injectionPoint() {
    return ["afterend", ".product-detail__price"];
  }

  // Same hydration-mismatch problem lidl.mjs documents: wait for the subtree to
  // settle or React reconciles our widget away.
  async scheduleRendering(handlers) {
    await waitForHydration(".product-detail");
    return super.scheduleRendering(handlers);
  }

  async scrape() {
    // The id in the URL is the single source of truth. On client-side
    // navigation Next.js can leave the previous page's JSON-LD in the DOM for a
    // tick, which would otherwise render the chart for the wrong product.
    const itemId = location.pathname.match(/_d(\d+)(?:\.html)?$/)?.[1];
    if (!itemId) return;

    let product = null;
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      let parsed;
      try {
        parsed = JSON.parse(script.textContent);
      } catch {
        continue;
      }
      const found = (Array.isArray(parsed) ? parsed : [parsed]).find(x => x["@type"] === "Product");
      if (found && String(found.sku) === itemId) {
        product = found;
        break;
      }
    }
    if (!product) return;

    const specs = product.offers?.priceSpecification ?? [];
    const priceOf = type => specs.find(s => s.priceType?.endsWith(type))?.price ?? null;
    const regularPrice = priceOf("RegularPrice");
    const salePrice = priceOf("SalePrice");
    const currentPrice = salePrice ?? regularPrice;
    // Delisted products keep a `priceSpecification` entry but drop its `price`
    // (and `priceCurrency`) entirely — e.g. `concept-zk4000_d367355`, which is
    // OutOfStock. There is no current price to anchor the chart on, so bail
    // rather than render one against a null.
    if (!currentPrice) return;

    // `image` is a bare URL string on listings but an array of ImageObjects on
    // the detail page.
    const image = product.image;
    const imageUrl = Array.isArray(image) ? image[0]?.url : image;

    return {
      itemId,
      title: product.name,
      currentPrice,
      originalPrice: regularPrice && currentPrice < regularPrice ? regularPrice : null,
      imageUrl
    };
  }
}

registerShop(new TsBohemia(), "tsbohemia");
