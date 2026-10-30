import test from "ava";
import { extractPrices } from "./prices.js";

// Trimmed ProductType entries from the apollo cache of nakup.itesco.cz/shop/cs-CZ/browse/ovoce-a-zelenina/all.
const mandarinky = {
  id: "213564945",
  productType: "LooseProduce",
  averageWeight: 0.14,
  price: { actual: 3.49, unitPrice: 24.9, unitOfMeasure: "kg" }
};
const mrkev = {
  id: "212691581",
  productType: "LooseProduce",
  averageWeight: 0.219,
  price: { actual: 5.45, unitPrice: 24.9, unitOfMeasure: "kg" }
};
const zazvor = {
  id: "212692779",
  productType: "CatchWeightProducts",
  averageWeight: 0.55,
  price: { actual: 129.9, unitPrice: 129.9, unitOfMeasure: "kg" }
};

test("loose produce in a promotion keeps the per-piece price and gets per-kg unit prices", t => {
  t.deepEqual(extractPrices(mandarinky, 49.9), {
    currentPrice: 3.49,
    currentUnitPrice: 24.9,
    discounted: true,
    useUnitPrice: true,
    originalPrice: 6.99,
    originalUnitPrice: 49.9,
    unitOfMeasure: "kg"
  });
});

test("loose produce without a promotion uses the unit price", t => {
  t.like(extractPrices(mrkev, undefined), {
    currentPrice: 5.45,
    currentUnitPrice: 24.9,
    discounted: false,
    useUnitPrice: true,
    unitOfMeasure: "kg"
  });
});

test("catch-weight products keep the per-kg price", t => {
  t.like(extractPrices(zazvor, 159.9), {
    currentPrice: 129.9,
    currentUnitPrice: 129.9,
    discounted: true,
    useUnitPrice: true,
    originalPrice: 159.9,
    originalUnitPrice: 159.9
  });
});
