import { readFile } from "node:fs/promises";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import test from "ava";
import { fridayNoirCategoryUrls, listingPageUrls, listingProducts } from "./listing.js";

const fixture = async name =>
  parseHTML(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8")).document;

const landingUrl = "https://www.megapixel.cz/slevove-akce-a-cashbacky";
const canonUrl = "https://www.megapixel.cz/friday-noir-canon";

test("Friday Noir categories are the tiles headed Friday Noir, other promotions are skipped", async t => {
  const document = await fixture("friday-noir.html");
  t.deepEqual(fridayNoirCategoryUrls(document, landingUrl), [
    "https://www.megapixel.cz/friday-noir-canon",
    "https://www.megapixel.cz/friday-noir-nikon",
    "https://www.megapixel.cz/friday-noir-prislusenstvi",
    "https://www.megapixel.cz/friday-noir-postproces",
    "https://www.megapixel.cz/friday-noir-atelier",
    "https://www.megapixel.cz/dzofilm-black-friday-2026-promotion",
    "https://www.megapixel.cz/hollyland-2026-bf-promo"
  ]);
});

test("category tiles are not products", async t => {
  const document = await fixture("friday-noir.html");
  t.deepEqual(listingProducts(document, landingUrl), [
    {
      itemId: "155962",
      itemUrl: "https://www.megapixel.cz/dzofilm-vespid-prime-5-lens-kit-16-25-35-50-75-mm-t2-1-metric"
    }
  ]);
});

test("product tiles give the product id and url", async t => {
  const document = await fixture("friday-noir-canon.html");
  t.deepEqual(listingProducts(document, canonUrl), [
    {
      itemId: "156858",
      itemUrl: "https://www.megapixel.cz/canon-eos-r50-rf-s-18-45-mm-f-4-5-6-3-is-stm-travel-kit-cerny"
    },
    { itemId: "159241", itemUrl: "https://www.megapixel.cz/canon-eos-r50-v-rf-s-14-30-mmf-4-6-3-is-stm" }
  ]);
});

test("slug is the last path segment, the key of the price history", async t => {
  const document = await fixture("friday-noir-canon.html");
  t.deepEqual(
    listingProducts(document, canonUrl).map(x => itemSlug(x.itemUrl)),
    ["canon-eos-r50-rf-s-18-45-mm-f-4-5-6-3-is-stm-travel-kit-cerny", "canon-eos-r50-v-rf-s-14-30-mmf-4-6-3-is-stm"]
  );
});

test("first page queues the remaining pages of the category", async t => {
  const document = await fixture("friday-noir-canon.html");
  t.deepEqual(listingPageUrls(document, canonUrl), ["https://www.megapixel.cz/friday-noir-canon?page=2"]);
  t.deepEqual(listingPageUrls(document, `${canonUrl}?page=2`), []);
});
