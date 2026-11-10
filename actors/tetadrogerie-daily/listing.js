/**
 * Modifies the page parameter in a URL for pagination
 * @param {string} originalUrl - The original URL to modify
 * @param {number} [newPage=1] - The new page number to set
 * @returns {string} Modified URL with updated page parameters
 */
export function changeListingUrlPage(originalUrl, newPage = 1) {
  newPage = String(newPage);

  const url = new URL(originalUrl);
  url.searchParams.set("page", String(newPage));
  url.searchParams.set("strana", String(newPage)); // Yes, it is really set twice on the API

  return url.href;
}

/**
 * API URL with the products of a listing page, or null when the page is not a listing:
 * - category `/eshop/produkty/<taxon>` -> `taxon=<taxon>`
 * - promotion `/akce/detail/<action>` (e.g. Black Friday `sn26bf0001`) -> `action=<action>`
 * The page number comes from the `strana` parameter of the page URL.
 * @param {string} pageUrl
 * @returns {string | null}
 */
export function listingApiUrl(pageUrl) {
  const url = new URL(pageUrl);
  if (url.hostname !== "www.tetadrogerie.cz") return null;
  const [, type, slug] = url.pathname.match(/^\/(eshop\/produkty|akce\/detail)\/(.+?)\/?$/) ?? [];
  if (!slug) return null;
  const currentPage = url.searchParams.get("strana") || "1";
  return `https://be.tetadrogerie.cz/api/v2/shop/search/products-variants?${new URLSearchParams({
    [type === "akce/detail" ? "action" : "taxon"]: slug,
    page: currentPage,
    itemsPerPage: "40",
    sort: "asc",
    order_by: "price",
    strana: currentPage // Yes, it is really like that on the API
  })}`;
}

/**
 * Builds a hierarchical category path from product taxons
 * @param {Array} categories - Array of category objects with hierarchy information
 * @returns {string|null} Category path separated by ' > ' or null if no categories
 */
function resolveCategory(categories) {
  if (!categories?.length) return null;

  const categoryPath = [];
  let currentCategory = categories[0];

  // Build category path from first level down
  while (currentCategory) {
    categoryPath.push(currentCategory.name);
    currentCategory = categories.find(category => category.parent.code === currentCategory.code);
  }

  return categoryPath.length ? categoryPath.join(" > ") : null;
}

/**
 * Parses product items from API response
 * @param json - API response containing product items
 * @returns {Array} Parsed product items
 */
export function parseItems(json) {
  return json.items.map(item => {
    const originalPrice = (item.bbyPrices.zcmd ?? item.originalPrice ?? item.price) / 100;
    let currentPrice = (item.bbyPrices.acmd ?? item.currentPrice ?? item.price) / 100;

    // We do not consider multi-item discount as a discount
    const isMultiItemDiscount = /za\s+.*ks\s+při\s+koupi.*\s+ks/i.test(item.bbyPrices.conditions);
    if (isMultiItemDiscount) {
      currentPrice = originalPrice;
    }

    return {
      itemId: String(item.code).replace(/^0+/g, ""),
      itemName: item.name.replace(/<[^>]*>/g, ""),
      img: `https://teta-drogerie.fra1.digitaloceanspaces.com/cache/inveocz_product_gallery/${item.image}`,
      slug: item.slug,
      itemUrl: `https://www.tetadrogerie.cz/eshop/katalog/${item.slug}`,
      currentPrice,
      originalPrice: currentPrice !== originalPrice ? originalPrice : null,
      discounted: originalPrice > currentPrice,
      inStock: item.isStockAvailable,
      category: resolveCategory(item.taxa)
    };
  });
}
