import test from "ava";
import { categoryItemsRequest, Label } from "../index.js";

test("should be GET request", t => {
  const { method } = categoryItemsRequest([]);
  t.is(method, "GET");
});

test("should be labeled as Detail", t => {
  const { userData } = categoryItemsRequest([]);
  t.is(userData.label, Label.Detail);
});

test("should set Referer", t => {
  const { headers } = categoryItemsRequest([]);
  t.is(headers.Referer, "https://www.electroworld.cz/blackfriday");
});

test("should set Origin", t => {
  const { headers } = categoryItemsRequest([]);
  t.is(headers.Origin, "https://www.electroworld.cz");
});

test("should accept JSON", t => {
  const { headers } = categoryItemsRequest([]);
  t.is(headers.Accept, "application/json");
});

test("should send JSON", t => {
  const { headers } = categoryItemsRequest([]);
  t.is(headers["Content-Type"], "application/json");
});
