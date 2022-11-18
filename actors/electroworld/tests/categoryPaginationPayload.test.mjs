import test from "ava";
import { categoryPaginationPayload, PageSize } from "../index.js";

test("should set category id", t => {
  const categoryId = 1;
  const { query } = categoryPaginationPayload(categoryId, null);
  t.is(query.article, categoryId);
});

test("should set page", t => {
  const page = 1;
  const { query } = categoryPaginationPayload(null, page);
  t.is(query.paging.page, page);
});

test("should set default page size", t => {
  const { query } = categoryPaginationPayload(null, null);
  t.is(query.paging.limit, PageSize);
});
