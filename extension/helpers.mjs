import { shopName } from "@hlidac-shopu/lib/shops.mjs";

export function cleanPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("cca")) priceText = priceText.split("cca")[1];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

export function cleanPrice(s) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  let priceText = el.textContent;
  return cleanPriceText(priceText);
}

export const shops = new Map();

export function registerShop(shop, ...names) {
  for (let name of names) {
    shops.set(name, shop);
  }
}

export function getShop(url) {
  return shops.get(shopName(url));
}
