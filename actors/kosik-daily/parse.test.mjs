import test from "ava";
import { parseItem } from "./parse.js";

// Trimmed items from /api/front/page/products
const pumpkin = {
  id: 315134,
  url: "/p315134-dyne-halloween",
  name: "Dýně Halloween",
  price: 75.112,
  recommendedPrice: 147.27199999999996,
  percentageDiscount: 48,
  pricePerUnit: { price: 22.9, unit: "kg" },
  productQuantity: { prefix: "cca", value: 3.28, unit: "kg" }
};

const pepper = {
  id: 794752,
  url: "/p794752-paprika-cervena-1-ks",
  name: "Paprika červená, 1 ks",
  price: 16.983,
  recommendedPrice: 16.983000000000004,
  percentageDiscount: 0,
  pricePerUnit: { price: 99.9, unit: "kg" },
  productQuantity: { prefix: "cca", value: 170.0, unit: "g" }
};

test("parseItem gives per-piece and per-kg prices of a discounted weighed item", t => {
  const p = parseItem(pumpkin, "Dýně a tykve");
  t.is(p.currentPrice, 75.11);
  t.is(p.originalPrice, 147.27);
  t.is(p.currentUnitPrice, 22.9);
  t.is(p.originalUnitPrice, 44.9);
  t.true(p.useUnitPrice);
});

test("parseItem gives no original price when recommendedPrice differs only by float noise", t => {
  const p = parseItem(pepper, "Papriky");
  t.is(p.currentPrice, 16.98);
  t.is(p.originalPrice, null);
  t.is(p.originalUnitPrice, null);
});

test("parseItem gives null originalUnitPrice without a unit price", t => {
  const { pricePerUnit, ...item } = pumpkin;
  t.is(parseItem(item, "Dýně a tykve").originalUnitPrice, null);
});
