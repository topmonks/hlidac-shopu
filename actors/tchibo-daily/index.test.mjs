import { readFile } from "node:fs/promises";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import test from "ava";
import { productsFromJsonListing } from "./index.js";

// `/bydleni/loznice` listing entries of the two products from #3642
const json = JSON.parse(await readFile(new URL("./fixtures/category-products.json", import.meta.url), "utf8"));
const scrape = (handledIdsSet = {}) =>
  productsFromJsonListing({ json, handledIdsSet, currency: "CZK", country: "cz", userData: { category: "Ložnice" } });
const byId = (products, id) => products.find(x => x.itemId === id);

test("every article of a product is a separate item", t => {
  const { products, numProductsScraped } = scrape();
  t.is(numProductsScraped, 18);
  t.is(products.length, 18);
  t.is(products.filter(x => x.itemUrl.includes("/160792105461/")).length, 15);
  t.is(products.filter(x => x.itemUrl.includes("/126184864744/")).length, 3);
});

test("slug is the article_id, the same the API derives from the URL", t => {
  const { products } = scrape();
  t.is(new Set(products.map(x => x.slug)).size, products.length);
  for (const product of products) {
    t.is(product.slug, new URL(product.itemUrl).searchParams.get("article_id"));
    t.is(product.slug, product.itemId);
    t.is(product.slug, itemSlug(product.itemUrl));
  }
});

test("articles keep their own price and discount", t => {
  const { products } = scrape();
  t.like(byId(products, "107006242765"), {
    itemName: "Žerzejové napínací prostěradlo, standardní velikost, bílá",
    currentPrice: 399,
    discounted: false,
    originalPrice: null
  });
  t.like(byId(products, "182927750847"), { currentPrice: 299, discounted: true, originalPrice: 299 });
  t.like(byId(products, "188554958226"), { currentPrice: 399, discounted: true, originalPrice: 449 });
});

test("an article seen in another category is not pushed twice", t => {
  const handledIdsSet = {};
  scrape(handledIdsSet);
  t.deepEqual(scrape(handledIdsSet).products, []);
});
