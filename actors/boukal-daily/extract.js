export function productSlug(url) {
  const parsed = new URL(url);
  if (!["www.boukal.cz", "boukal.cz"].includes(parsed.hostname)) return null;
  return parsed.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? parsed.pathname.match(/\/([^/]+_p\d+)\/?$/)?.[1] ?? null;
}

export function extractDetail(document, url) {
  const product = document.querySelector(".product_detail");
  const slug = productSlug(url);
  const itemId = product?.querySelector('meta[itemprop="sku"]')?.getAttribute("content");
  const itemName = product?.querySelector("#productTitlePc")?.textContent.trim();
  const offer = product?.querySelector(".preBuy_box");
  const price = offer?.querySelector('.current_price [itemprop="price"]');
  // The product sitemap also contains non-purchasable entries such as the loyalty programme.
  if (slug && itemId && itemName && !price) return null;
  const currentPrice = Number(price?.getAttribute("content"));
  const currency = offer?.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content");
  if (!slug || !itemId || !itemName || !(currentPrice > 0) || currency !== "CZK") {
    throw new Error(`Product data missing or invalid: ${url}`);
  }
  const image = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
  return {
    shop: "boukal_cz",
    shopOrigin: "boukal.cz",
    slug,
    itemId,
    itemName,
    itemUrl: `https://www.boukal.cz${new URL(url).pathname.replace(/\/$/, "")}`,
    img: image ? new URL(image, url).href : null,
    currentPrice,
    // Neither regular nor campaign details display a pre-discount price.
    // data-contentold is the unrounded CURRENT price, not an original price.
    originalPrice: null,
    discounted: false,
    currency,
    category: [...document.querySelectorAll('[itemtype$="BreadcrumbList"] a [itemprop="name"]')]
      .map(node => node.textContent.trim())
      .filter(Boolean)
      .join(" > "),
    inStock: /\/InStock$/.test(offer.querySelector('[itemprop="availability"]')?.getAttribute("href") ?? "")
  };
}

export function sitemapRequests(document) {
  if (document.querySelector("sitemapindex")) {
    return [...document.querySelectorAll("sitemap > loc")]
      .map(node => node.textContent.trim())
      .filter(url => /^https:\/\/www\.boukal\.cz\/sitemap-products-\d+\.xml$/.test(url))
      .map(url => ({ url, userData: { label: "SITEMAP" } }));
  }
  return [...document.querySelectorAll("url > loc")]
    .map(node => node.textContent.trim())
    .filter(url => {
      const parsed = new URL(url);
      const slug = productSlug(url);
      return (
        slug &&
        !parsed.search &&
        !/_c\d+$/.test(slug) &&
        !/^(kontakt|kontakty|prihlaseni|registrace|nakupni-kosik|vernostni-program-vernostni-program)$/.test(slug)
      );
    })
    .map(url => ({ url, userData: { label: "DETAIL" } }));
}
