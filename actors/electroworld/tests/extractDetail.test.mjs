import test from "ava";
import { extractDetail } from "../index.js";
import payload from "./payload/productBoxes.json" assert { type: "json" };

test("should extract data", t => {
  for (const productBox of payload.productBoxes) {
    const detail = extractDetail("https://www.electroworld.cz", productBox);
    const { name, id } = productBox.product;
    t.like(detail, { itemId: id, itemName: name });
  }
});
