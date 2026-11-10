import test from "ava";
import { discount, prepareData, realDiscount } from "./discount.mjs";

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

const daysAgo = n => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const meta = { commonPrice: 4999, minPrice: 3999 };

test("realDiscount returns the common price along with the EU minimum", t => {
  const rows = [
    { currentPrice: 4999, date: daysAgo(2) },
    { currentPrice: 3499, date: daysAgo(1) }
  ];
  const result = realDiscount(meta, rows);
  t.is(result.type, "eu-minimum");
  t.is(result.commonPrice, 4999);
  t.is(result.minPrice, 3999);
  t.is(result.realDiscount, (3999 - 3499) / 3999);
});

test("realDiscount returns only the common price for common price", t => {
  const rows = [
    { currentPrice: 3999, date: daysAgo(30) },
    { currentPrice: 4999, date: daysAgo(2) }
  ];
  const result = realDiscount(meta, rows);
  t.is(result.type, "common-price");
  t.is(result.commonPrice, 4999);
  t.false("minPrice" in result);
  t.is(result.realDiscount, 0);
});
