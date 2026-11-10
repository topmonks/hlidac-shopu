import test from "ava";
import { discount, prepareData } from "./discount.mjs";

const historicalData = {
  "entries": [
    { "c": 499, "d": "2021-03-13", "o": null },
    { "c": 499, "d": "2021-03-14", "o": null },
    { "c": null, "d": "2021-07-15", "o": null },
    { "c": 499, "d": "2021-09-29", "o": null },
    { "c": 359, "d": "2021-10-29", "o": 499 },
    { "c": 359, "d": "2021-10-30", "o": 499 },
    { "c": 359, "d": "2021-11-08", "o": 499 }
  ]
};

test("prepareData should return ", t => {
  prepareData(historicalData);
  t.pass();
});

test("discount of the discontinued item should be null", t => {
  t.is(discount(1, null), null);
});

test("discount for the same prices should be 0", t => {
  t.is(discount(1, 1), 0);
});

test("discount for discounted item should be as expected", t => {
  t.is(discount(1, 0.1), 0.9);
});
