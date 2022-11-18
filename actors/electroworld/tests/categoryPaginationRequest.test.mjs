import test from "ava";
import { categoryPaginationRequest, Label } from "../index.js";

test("should be POST request", t => {
  const { method } = categoryPaginationRequest(null, null);
  t.is(method, "POST");
});

test("should be labeled as Category", t => {
  const { userData } = categoryPaginationRequest(null, null);
  t.is(userData.label, Label.Pagination);
});

test("should set categoryId", t => {
  const categoryId = 1;
  const { userData } = categoryPaginationRequest(categoryId, null);
  t.is(userData.categoryId, categoryId);
});

test("should set Referer", t => {
  const { headers } = categoryPaginationRequest(null, null);
  t.is(headers.Referer, "https://www.electroworld.cz/");
});

test("should set Origin", t => {
  const { headers } = categoryPaginationRequest(null, null);
  t.is(headers.Origin, "https://www.electroworld.cz");
});

test("should accept JSON", t => {
  const { headers } = categoryPaginationRequest(null, null);
  t.is(headers.Accept, "application/json");
});

test("should send JSON", t => {
  const { headers } = categoryPaginationRequest(null, null);
  t.is(headers["Content-Type"], "application/json");
});
