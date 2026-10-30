import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/actors-common/product.js";

export const baseUrl = "https://www.kosik.cz/";

// The API returns floats like 16.983000000000004 for a price shown as 16,98 Kč
const round = x => (typeof x === "number" ? Math.round(x * 100) / 100 : null);

export function parseItem(item, breadcrumbs) {
  const itemUrl = new URL(item.url, baseUrl).href;
  const currentPrice = round(item.price);
  const recommendedPrice = round(item.recommendedPrice);
  const originalPrice = currentPrice === recommendedPrice ? null : recommendedPrice;
  const pricePerUnit = item.pricePerUnit?.price;
  return {
    itemId: item.id,
    itemUrl,
    itemName: item.name,
    discounted: item.percentageDiscount > 0,
    discountedName: item.percentageDiscount > 0 ? `${item.percentageDiscount} %` : null,
    currentPrice,
    originalPrice,
    inStock: !item.firstOrderDay,
    category: breadcrumbs,
    img: item.image,
    shop: shopName(itemUrl),
    slug: itemSlug(itemUrl),
    shopOrigin: shopOrigin(itemUrl),
    currentUnitPrice: pricePerUnit ?? null,
    originalUnitPrice:
      originalPrice && pricePerUnit && item.price ? round((item.recommendedPrice * pricePerUnit) / item.price) : null,
    useUnitPrice: item.productQuantity?.prefix === "cca",
    quantity: item.productQuantity?.value
  };
}
