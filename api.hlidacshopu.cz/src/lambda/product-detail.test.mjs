import test from "ava";
import { metadataPkey } from "./product-detail.mjs";

test("metadataPkey", t => {
  t.is(metadataPkey("name", "itemUrl"), "name:itemUrl");
});
