import test from "ava";
import { prepareData } from "./discount.mjs";

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
  const result = prepareData(historicalData);
  t.pass();
});
