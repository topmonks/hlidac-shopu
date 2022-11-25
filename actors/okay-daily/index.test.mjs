import test from "ava";
import inputWithSale from "./fixtures/with-sale.js";
import inputWithoutSale from "./fixtures/without-sale.js";
import { calculateTagSalePrice } from "./index.js";

test("calculateTagSalePrice with sale", t => {
  t.like(calculateTagSalePrice(inputWithSale), {
    price_min: 94
  });
});

test("calculateTagSalePrice without sale", t => {
  t.like(calculateTagSalePrice(inputWithoutSale), {
    price_min: 78
  });
});
