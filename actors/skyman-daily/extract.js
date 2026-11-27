export function productSlug(url) {
  const parsed = new URL(url);
  if (!["www.skyman.cz", "skyman.cz"].includes(parsed.hostname)) return null;
  const match = parsed.pathname.match(/^\/p\/([^/]+)(?:\/(\d+))?\/?$/);
  if (!match) return null;
  const variant = parsed.hash.match(/^#(\d+)$/)?.[1] ?? match[2];
  return variant ? `${match[1]}-${variant}` : match[1];
}

function price(text) {
  const value = Number(
    text
      ?.replace(/\s+/g, "")
      .match(/\d+(?:[,.]\d+)?/)?.[0]
      ?.replace(",", ".")
  );
  return value > 0 ? value : null;
}

export function extractDetail(document, url) {
  const product = document.querySelector("article.sh--product");
  const slug = productSlug(url);
  const itemName = product?.querySelector(':scope > meta[itemprop="name"]')?.getAttribute("content");
  const currentPrice = price(product?.querySelector('.pd-prices [itemprop="price"]')?.getAttribute("content"));
  const currency = product?.querySelector('.pd-prices [itemprop="priceCurrency"]')?.getAttribute("content");
  const itemId = product?.querySelector(".ChangeQuantity[data-product-id]")?.getAttribute("data-product-id");
  if (slug && itemId && itemName && !product.querySelector('.pd-prices [itemprop="price"]')) return null;
  if (!slug || !itemId || !itemName || !currentPrice || currency !== "CZK") {
    throw new Error(`Product data missing or invalid: ${url}`);
  }
  const original = price(product.querySelector(".pd-prices .standard_pricex")?.textContent);
  const originalPrice = original > currentPrice ? original : null;
  const category = [...document.querySelectorAll('.breadcrumbs-pd [itemprop="name"]')]
    .map(node => node.textContent.trim())
    .filter(Boolean)
    .join(" > ");
  return {
    shop: "skyman_cz",
    shopOrigin: "skyman.cz",
    slug,
    itemId,
    itemName,
    itemUrl: `https://www.skyman.cz${new URL(url).pathname.replace(/\/$/, "")}`,
    img: product.querySelector('img[itemprop="image"]')?.getAttribute("src") ?? null,
    currentPrice,
    originalPrice,
    discounted: originalPrice !== null,
    currency,
    category,
    inStock: /\/(InStock|LimitedAvailability)$/.test(
      product.querySelector('.pd-prices [itemprop="availability"]')?.getAttribute("href") ?? ""
    )
  };
}

// The complete variant table is server-rendered; no disallowed AJAX endpoint is needed.
export function extractProducts(document, url) {
  const parsed = new URL(url);
  const selected = parsed.hash.match(/^#(\d+)$/)?.[1] ?? parsed.pathname.match(/\/(\d+)\/?$/)?.[1];
  parsed.pathname = parsed.pathname.replace(/\/\d+\/?$/, "");
  parsed.hash = "";
  const base = extractDetail(document, parsed.href);
  if (!base) return [];
  const rows = document.querySelectorAll("article.sh--product .VariantTableRow");
  const products = [
    base,
    ...[...rows].map(row => {
      const id = row.id.match(/^variant_(\d+)$/)?.[1];
      const cell = row.querySelector("td.fw-b").cloneNode(true);
      for (const node of cell.querySelectorAll(".price-excl-vat")) node.remove();
      const currentPrice = price(cell.textContent);
      if (!id || !currentPrice) throw new Error(`Invalid variant in ${url}`);
      return {
        ...base,
        itemId: row.getAttribute("data-conversion_product_id"),
        slug: `${base.slug}-${id}`,
        itemUrl: `${base.itemUrl}#${id}`,
        itemName: `${base.itemName} - ${row.querySelector("td:nth-child(2)").textContent.trim()}`,
        currentPrice,
        // The table does not show a reference price for each variant.
        originalPrice: null,
        discounted: false,
        img: row.querySelector("img")?.getAttribute("src") ?? base.img,
        inStock:
          /Skladem|sklad/i.test(row.querySelector(".availability")?.textContent ?? "") &&
          !/není|neni|vyprod/i.test(row.querySelector(".availability")?.textContent ?? "")
      };
    })
  ];
  if (!selected) return products;
  const product = products.find(product => product.slug === `${base.slug}-${selected}`);
  if (!product) throw new Error(`Variant ${selected} missing in ${url}`);
  return [product];
}

export function sitemapRequests(document) {
  if (document.querySelector("sitemapindex")) {
    return [...document.querySelectorAll("sitemap > loc")]
      .map(node => node.textContent.trim())
      .filter(url => /^https:\/\/www\.skyman\.cz\/sitemap-products(?:-\d+)?\.xml(?:\.gz)?$/.test(url))
      .map(url => ({ url, userData: { label: "SITEMAP" } }));
  }
  // Every variant is in the parent's server-rendered table. Fetch each parent
  // once, including parents that the sitemap only references through a variant.
  const parents = new Map();
  for (const node of document.querySelectorAll("url > loc")) {
    const url = node.textContent.trim();
    if (!productSlug(url)) continue;
    const variant = new URL(url).pathname.match(/\/(\d+)\/?$/)?.[1];
    const parent = url.replace(/\/\d+\/?$/, "");
    if (!parents.has(parent)) parents.set(parent, new Set());
    if (variant) parents.get(parent).add(variant);
  }
  return [...parents].map(([url, variants]) => ({
    url,
    userData: { label: "DETAIL", variantIds: [...variants] }
  }));
}
