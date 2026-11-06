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
  t.deepEqual(
    listingProducts(document, landingUrl).map(x => x.itemId),
    ["155962"]
  );
});

test("product tiles give the product id, url, name, image and prices", async t => {
  const document = await fixture("friday-noir-canon.html");
  t.deepEqual(listingProducts(document, canonUrl), [
    {
      itemId: "156858",
      itemUrl: "https://www.megapixel.cz/canon-eos-r50-rf-s-18-45-mm-f-4-5-6-3-is-stm-travel-kit-cerny",
      itemName: "Canon EOS R50 + RF-S 18-45 mm f/4,5-6,3 IS STM Travel Kit černý",
      img: "https://cdn.megapixel.cz/images/product-w200h200/7/472307.jpg?v=1738657088",
      currentPrice: 20490,
      originalPrice: 24290
    },
    {
      itemId: "159241",
      itemUrl: "https://www.megapixel.cz/canon-eos-r50-v-rf-s-14-30-mmf-4-6-3-is-stm",
      itemName: "Canon EOS R50 V + RF-S 14-30 mm f/4-6,3 IS STM - zpětná sleva 3 500 Kč",
      img: "https://cdn.megapixel.cz/images/product-w200h200/9/484129.jpg?v=1743009335",
      currentPrice: 21490,
      originalPrice: 24790
    }
  ]);
});

test("crossed-out price that is not above the price is not an original price", t => {
  const { document } = parseHTML(`<div id="snippet-productsFilter-products"><section class="js-product-box">
    <a class="product-box__link" href="/x" onclick="onProductItem1Click(this)"></a>
    <p class="product-box__price-old"><del>990 Kč</del></p><p class="product-box__price">990 Kč</p>
  </section></div>`);
  const [product] = listingProducts(document, canonUrl);
  t.is(product.currentPrice, 990);
  t.is(product.originalPrice, null);
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
