import { shops as shops_lib, shopName } from "@hlidac-shopu/lib/shops.mjs";

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
//Check if price is per unit or per weight
export function isUnitPrice(s) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  return el.textContent.includes("/kg");
}
//Get price for product weight from price per 1 Kg
export function cleanUnitPrice(s, quantity) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  let priceText = el.textContent;
  const unitPrice = cleanUnitPriceText(priceText);
  return quantity * (unitPrice / 1000).toFixed(2);
}

export function cleanUnitPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("/kg")) priceText = priceText.split("/kg")[0];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
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

export function getItemIdFromUrl(url) {
  const shop = shops_lib.get(shopName(url));
  return shop.parse(url).itemId;
}
