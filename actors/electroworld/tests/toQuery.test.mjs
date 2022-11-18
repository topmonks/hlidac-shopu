import test from "ava";
import { toQuery } from "../index.js";

test("empty array should return empty query", t => {
  t.is(toQuery([]), "");
});

test("one item array should return query with one array item", t => {
  t.is(toQuery([1]), "id[]=1");
});

test("more items array should return query with concatenated array items", t => {
  t.is(toQuery([1, 2]), "id[]=1&id[]=2");
});
