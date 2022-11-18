import test from "ava";
import { categoryRequest, Label } from "../index.js";

test("should be POST request", t => {
  const { method } = categoryRequest(null, null);
  t.is(method, "POST");
});

test("should be labeled as Category", t => {
  const { userData } = categoryRequest(null, null);
  t.is(userData.label, Label.Category);
});

test("should set Referer", t => {
  const { headers } = categoryRequest(null, null);
  t.is(headers.Referer, "https://www.electroworld.cz/");
});

test("should set Origin", t => {
  const { headers } = categoryRequest(null, null);
  t.is(headers.Origin, "https://www.electroworld.cz");
});

test("should accept JSON", t => {
  const { headers } = categoryRequest(null, null);
  t.is(headers.Accept, "application/json");
});

test("should send JSON", t => {
  const { headers } = categoryRequest(null, null);
  t.is(headers["Content-Type"], "application/json");
});
