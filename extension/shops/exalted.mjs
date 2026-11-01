import { cleanPrice, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// exalted.com is a Nuxt SPA (Vendure backend); one domain for all markets,
// locale is the first path segment: /cs/products/214/slug, /sk/products/214/slug
const priceRowSelector = ".product-price-row";

function findProductLd() {
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      const product = [data].flat().find(x => x?.["@type"] === "Product");
      if (product) return product;
    } catch {}
  }
  return null;
}

export class Exalted extends AsyncShop {
  get waitForSelector() {
    return priceRowSelector;
  }

  // Injecting as a sibling between Vue-rendered blocks breaks Nuxt hydration when
  // it runs after us: Vue matches children by position, adopts our widget as the
  // next block and moves the size/colour picker into it. As the *last child* of
  // the price row we are just a trailing extra node – Vue removes it at worst and
  // AsyncShop re-injects it (isRendered check). Price row is flex-wrap, so full
  // width puts the chart on its own line right under price and rating.
  get injectionPoint() {
    return ["beforeend", priceRowSelector, { "flex-basis": "100%", "width": "100%" }];
  }

  async scrape() {
    // product ID is shared across locales and matches lib/shops.mjs parser
    const itemId = location.pathname.match(/\/products\/(\d+)/)?.[1];
    if (!itemId) return;

    const ld = findProductLd();
    // prefer the price shown on the page, it reflects the selected variant
    const shownPrice = cleanPrice(`${priceRowSelector} .product-price-lines span:not(.line-through)`);
    const ldPrices = [ld?.offers ?? []]
      .flat()
      .map(o => Number.parseFloat(o.price))
      .filter(Number.isFinite);
    const currentPrice = shownPrice ?? (ldPrices.length ? String(Math.min(...ldPrices)) : null);
    const originalPrice = cleanPrice(`${priceRowSelector} .line-through`);

    const title = ld?.name ?? document.querySelector("h1")?.textContent?.trim();
    const imageUrl = [ld?.image ?? []].flat()[0] ?? document.querySelector('meta[property="og:image"]')?.content;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Exalted(), "exalted_cz", "exalted_sk");
