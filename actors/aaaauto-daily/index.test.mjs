import test from "ava";
import { Country, parseProducts } from "./index.js";

// Trimmed shape of a real car-list.message.items[] entry (aaaauto Angular SSR payload).
const item = {
  id: 30311332,
  isSold: false,
  displayTitle: "Škoda Superb",
  webHeadline: "2.0 TDI, 4x4, Automat",
  productionYear: 2016,
  mileage: 311285,
  mileageUnit: "km",
  make: { slug: "skoda" },
  model: { slug: "superb" },
  gearbox: { title: "Automatická" },
  fuel: { title: "Diesel" },
  engine: { title: "2.0 TDI" },
  photos: { default: ["https://img/900590383_1024x768x95.jpg"] },
  price: { cash: "210000", oldCash: "220000" }
};

test("parseProducts maps a discounted car", t => {
  const [p] = parseProducts([item], Country.CZ);
  t.is(p.itemId, "30311332");
  t.is(p.itemUrl, "https://www.aaaauto.cz/detail/skoda/superb/30311332");
  t.is(p.itemName, "Škoda Superb");
  t.is(p.currentPrice, "210000");
  t.is(p.originalPrice, 220000);
  t.true(p.discounted);
  t.is(p.currency, "Kč");
  t.is(p.km, "311285 km");
});

test("parseProducts skips sold cars and non-discounted has no originalPrice", t => {
  const sold = { ...item, isSold: true };
  t.is(parseProducts([sold], Country.CZ).length, 0);

  const full = { ...item, price: { cash: "210000", oldCash: "0" } };
  const [p] = parseProducts([full], Country.SK);
  t.false(p.discounted);
  t.is(p.originalPrice, undefined);
  t.is(p.currency, "Eur");
});
