import { cleanPriceText, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Tesco's redesigned product page (React SPA) has no stable CSS classes, but
// the buy box and title carry data-auto hooks and the page ships a JSON-LD
// Product with the id, name and image.
const buyBoxSelector = '[data-auto="pdp-buy-box"]';

function findProductLd() {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : (data?.["@graph"] ?? [data]);
      const product = items.find(item => item?.["@type"] === "Product");
      if (product) return product;
    } catch {}
  }
  return null;
}

const weightProductTypes = ["CatchWeightProducts", "LooseProduce"];

// Products sold by weight keep their price history per kg: catch-weight meat and
// fish (pieces of a chosen weight) and loose fruit and vegetables (bought by
// piece or by weight, the per-piece price depends on an average weight).
// The catch-weight picker is shown only when there is more than one weight,
// loose produce has a "Množství / Hmotnost" switch; the discover JSON names
// the type either way, though it can be stale after SPA navigation.
function isSoldByWeight(itemId) {
  if (document.getElementById(`catch-weight-${itemId}`)) return true;
  if (document.getElementById(`weight-mode-${itemId}`)) return true;
  for (const script of document.querySelectorAll('script[type="application/discover+json"]')) {
    try {
      const cache = JSON.parse(script.textContent)?.["mfe-orchestrator"]?.props?.apolloCache;
      const product = cache?.[`ProductType:${itemId}`];
      if (product) return weightProductTypes.includes(product.productType);
    } catch {}
  }
  return false;
}

// Promotions show "-50%, předtím 39,90 Kč". The promo line may be per kg while
// the current price is not, so accept the "before" price only when it is
// consistent with the current price and the percentage.
function originalPrice(root, currentPrice) {
  const promo = Array.from(root.querySelectorAll("p")).find(p => /p[řr]edt[íý]m/.test(p.textContent));
  const match = promo?.textContent.match(/-(\d+)\s*%.*?p[řr]edt[íý]m\s*([\d\s]+(?:,\d+)?)/);
  if (!match) return null;
  const percent = Number(match[1]);
  const before = Number(cleanPriceText(match[2]));
  const expected = before * (1 - percent / 100);
  if (!before || !currentPrice || Math.abs(expected - currentPrice) > expected * 0.05) return null;
  return before.toFixed(2);
}

export class Tesco extends AsyncShop {
  get waitForSelector() {
    return buyBoxSelector;
  }

  get injectionPoint() {
    return ["afterend", buyBoxSelector];
  }

  async scrape() {
    const buyBox = document.querySelector(buyBoxSelector);
    const ld = findProductLd();
    if (!buyBox || !ld) return;

    // The URL id is what lib/shops.mjs parses and the API resolves.
    const itemId = location.pathname.match(/\/products\/(\d+)/)?.[1] ?? ld.sku;
    if (!itemId) return;

    // Scope the promo lookup to the product details, not related-product tiles.
    const title = document.querySelector('[data-auto="pdp-product-title"]');
    let root = title ?? buyBox;
    while (root.parentElement && !root.contains(buyBox)) root = root.parentElement;

    // Read the price from the buy box: during a Clubcard promotion the JSON-LD
    // offer carries the Clubcard price, while the buy box shows the regular one.
    const unitPrice = buyBox.querySelector('[class*="product-tile-unit-price__subtext"]')?.textContent;
    const priceText =
      isSoldByWeight(itemId) && unitPrice?.includes("/kg")
        ? unitPrice
        : buyBox.querySelector('[class*="product-tile-price__text"]')?.textContent;
    const currentPrice = Number(cleanPriceText(priceText)) || null;
    const image = Array.isArray(ld.image) ? ld.image[0] : ld.image;
    return {
      itemId,
      title: ld.name ?? title?.textContent?.trim(),
      currentPrice,
      originalPrice: originalPrice(root, currentPrice),
      imageUrl: typeof image === "string" ? image : image?.url
    };
  }
}

registerShop(new Tesco(), "itesco", "itesco_sk");
