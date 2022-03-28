import test from "ava";
import { extractPrice } from "./main.js";

test("extractPrice", t => {
  const result = extractPrice("1 000 000 Kč");
  t.is(result, 1000000);
});
