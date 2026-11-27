export function productSlug(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "www.e-les.cz" && parsed.hostname !== "e-les.cz") return null;
  const path = parsed.pathname.replace(/\/$/, "");
  if (!/^\/[^/]+$/.test(path)) return null;
  if (/-[cag]\d+(?:_\d+)*\.htm$/i.test(path)) return null;
  if (/\.(?!htm$)[a-z\d]+$/i.test(path)) return null;
  return path.match(/-d(\d+)\.htm$/)?.[1] ?? path.slice(1);
}

export function productId(document, url) {
  const snapshot = document.querySelector("#eshopDataLayerSnapshot");
  if (snapshot) {
    try {
      const id = String(JSON.parse(snapshot.textContent).product?.id ?? "");
      return /^\d+$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }
  // Older saved pages may lack the snapshot; legacy URLs expose the same ID.
  return new URL(url).pathname.match(/-d(\d+)\.htm\/?$/)?.[1] ?? null;
}

export function productData(document) {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      const product = (data["@graph"] ?? (Array.isArray(data) ? data : [data])).find(node =>
        [node["@type"]].flat().includes("Product")
      );
      if (product) return product;
    } catch {}
  }
  return null;
}

export function extractDetail(document, url) {
  const slug = productSlug(url);
  const product = productData(document);
  // Custom slugs can also be categories or articles. Only Product pages are saved.
  if (!product) return null;
  const itemId = productId(document, url);
  const offer = product?.offers;
  if (slug && product?.name && offer?.price == null) return null;
  const currentPrice = Number(offer?.price);
  if (!slug || !itemId || !product?.name || !(currentPrice > 0) || offer.priceCurrency !== "CZK") {
    throw new Error(`Product data missing or invalid: ${url}`);
  }
  // This block is the shop's displayed pre-discount price, including VAT.
  const reference = (
    document.querySelector('[title="Nejnižší prodejní cena za posledních 30 dní"]')?.nextElementSibling ??
    document.querySelector(".c754 .price .c757")
  )?.textContent;
  const original = Number(reference?.replace(/[^\d,.-]/g, "").replace(",", "."));
  const originalPrice = original > currentPrice ? original : null;
  return {
    shop: "e-les_cz",
    shopOrigin: "e-les.cz",
    slug,
    itemId,
    itemUrl: `https://www.e-les.cz${new URL(url).pathname.replace(/\/$/, "")}`,
    itemName: product.name,
    img: (Array.isArray(product.image) ? product.image[0] : product.image) || null,
    currentPrice,
    originalPrice,
    discounted: originalPrice !== null,
    currency: "CZK",
    category: product.category ?? "",
    inStock: /\/(InStock|LimitedAvailability)$/.test(offer.availability ?? "")
  };
}

export function sitemapRequests(document) {
  return [...document.querySelectorAll("url > loc")]
    .map(node => node.textContent.trim())
    .filter(url => {
      const parsed = new URL(url);
      return (
        productSlug(url) &&
        !parsed.search &&
        !/^\/(blog(?:\/|$)|osobni-udaje-|ochrana-osobnich-udaju-|odstoupeni-od-kupni-smlouvy$|elektronicka-evidence-trzeb$|prava-vadneho-plneni$|show-free\.htm$)/i.test(
          parsed.pathname
        )
      );
    })
    .map(url => ({ url, userData: { label: "DETAIL" } }));
}
