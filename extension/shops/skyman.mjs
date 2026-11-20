import { cleanPrice, cleanPriceText, getItemIdFromUrl, registerShop } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

export class Skyman extends AsyncShop {
  get injectionPoint() {
    return ["afterend", "article.sh--product .pd-prices"];
  }

  get waitForSelector() {
    return "article.sh--product .pd-prices";
  }

  async scrape(document = globalThis.document, url = globalThis.location.href) {
    const itemId = getItemIdFromUrl(new URL(url));
    const product = document.querySelector("article.sh--product");
    if (!itemId || !product) return;
    const title = product.querySelector(':scope > meta[itemprop="name"]')?.getAttribute("content");
    const parsed = new URL(url);
    const variant = parsed.hash.match(/^#(\d+)$/)?.[1] ?? parsed.pathname.match(/\/(\d+)\/?$/)?.[1];
    if (variant) {
      const row = product.querySelector(`#variant_${variant}`);
      const cell = row?.querySelector("td.fw-b")?.cloneNode(true);
      if (!cell) return;
      for (const node of cell.querySelectorAll(".price-excl-vat")) node.remove();
      const currentPrice = cleanPriceText(cell.textContent);
      if (!(Number(currentPrice) > 0) || !title) return;
      return {
        itemId,
        title: `${title} - ${row.querySelector("td:nth-child(2)").textContent.trim()}`,
        currentPrice,
        originalPrice: null,
        imageUrl: row.querySelector("img")?.getAttribute("src") ?? null
      };
    }
    const currentPrice = product.querySelector('.pd-prices [itemprop="price"]')?.getAttribute("content");
    const currency = product.querySelector('.pd-prices [itemprop="priceCurrency"]')?.getAttribute("content");
    if (!title || !(Number(currentPrice) > 0) || currency !== "CZK") return;
    const original = cleanPrice(product.querySelector(".pd-prices .standard_pricex"));
    return {
      itemId,
      title,
      currentPrice,
      originalPrice: Number(original) > Number(currentPrice) ? original : null,
      imageUrl: product.querySelector('img[itemprop="image"]')?.getAttribute("src") ?? null
    };
  }
}

registerShop(new Skyman(), "skyman_cz");
