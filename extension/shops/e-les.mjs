import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

export class ELes extends Shop {
  get injectionPoint() {
    return ["afterend", '[data-selector="dialTooltipBoundary"], .c754'];
  }

  async scrape(document = globalThis.document, url = globalThis.location.href) {
    let itemId;
    try {
      const snapshot = document.querySelector("#eshopDataLayerSnapshot");
      itemId = snapshot
        ? String(JSON.parse(snapshot.textContent).product?.id ?? "")
        : new URL(url).pathname.match(/-d(\d+)\.htm\/?$/)?.[1];
    } catch {
      return;
    }
    if (!/^\d+$/.test(itemId ?? "")) return;
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        const product = (data["@graph"] ?? (Array.isArray(data) ? data : [data])).find(node =>
          [node["@type"]].flat().includes("Product")
        );
        const currentPrice = Number(product?.offers?.price);
        if (!product?.name || !(currentPrice > 0) || product.offers.priceCurrency !== "CZK") continue;
        const original = cleanPrice(
          document.querySelector('[title="Nejnižší prodejní cena za posledních 30 dní"]')?.nextElementSibling ??
            document.querySelector(".c754 .price .c757")
        );
        return {
          itemId,
          title: product.name,
          currentPrice: String(currentPrice),
          originalPrice: Number(original) > currentPrice ? original : null,
          imageUrl: (Array.isArray(product.image) ? product.image[0] : product.image) || null
        };
      } catch {}
    }
  }
}

registerShop(new ELes(), "e-les_cz");
