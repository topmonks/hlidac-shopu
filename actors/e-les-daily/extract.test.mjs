import { readFile } from "node:fs/promises";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { ELes } from "../../extension/shops/e-les.mjs";
import { itemSlug } from "../../lib/shops.mjs";
import { extractDetail, productData, productSlug, sitemapRequests } from "./extract.js";

async function fixture(name) {
  return parseHTML(await readFile(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8")).document;
}

for (const [name, price, original, id] of [
  ["discounted", 14990, 19190, "9330"],
  ["regular", 320, null, "2187"],
  ["custom-slug", 500, null, "22521"]
]) {
  test(`${name}: actor and extension agree on VAT-inclusive prices and history key`, async t => {
    const document = await fixture(name);
    const url = productData(document).offers.url;
    const product = extractDetail(document, url);
    t.like(product, {
      itemId: id,
      currentPrice: price,
      originalPrice: original,
      discounted: original !== null,
      currency: "CZK",
      inStock: true
    });
    t.is(product.slug, itemSlug(url));
    t.truthy(product.img);
    t.truthy(product.category);
    const extension = new ELes();
    const info = await extension.scrape(document, url);
    t.is(info.itemId, product.itemId);
    t.is(Number(info.currentPrice), price);
    t.is(info.originalPrice === null ? null : Number(info.originalPrice), original);
    t.is(info.title, product.itemName);
    t.is(info.imageUrl, product.img);
    t.truthy(document.querySelector(extension.injectionPoint[1]));
  });
}

test("a reference price below the selling price is not a discount", async t => {
  const document = await fixture("discounted");
  document.querySelector(".price .c757").textContent = "1 Kč";
  const url = productData(document).offers.url;
  t.is(extractDetail(document, url).originalPrice, null);
  t.is((await new ELes().scrape(document, url)).originalPrice, null);
});

test("non-product pages are skipped by the actor and extension", async t => {
  const { document } = parseHTML("<h1>Not a product</h1>");
  const url = "https://www.e-les.cz/product-d1.htm";
  t.is(extractDetail(document, url), null);
  t.is(await new ELes().scrape(document, url), undefined);
});

test("sitemap queues legacy and custom candidates, excluding obvious non-product URLs", t => {
  const { document } = parseXML(`<urlset>
    <url><loc>https://www.e-les.cz/STIHL-SR-450-d9330.htm</loc></url>
    <url><loc>https://www.e-les.cz/STIHL-c43_0_1.htm</loc></url>
    <url><loc>https://www.e-les.cz/stihl-topny-prvek-11414345130</loc></url>
    <url><loc>https://www.e-les.cz/stihl-topny-prvek-11404306004</loc></url>
    <url><loc>https://www.e-les.cz/OBCHODNI-PODMINKY-a3_0.htm</loc></url>
    <url><loc>https://www.e-les.cz/osobni-udaje-newsletter</loc></url>
    <url><loc>https://www.e-les.cz/blog/article</loc></url>
    <url><loc>https://www.e-les.cz/blog?tag=STIHL</loc></url>
    <url><loc>https://www.e-les.cz/</loc></url>
    <url><loc>https://example.com/product-d1.htm</loc></url>
  </urlset>`);
  t.deepEqual(sitemapRequests(document), [
    { url: "https://www.e-les.cz/STIHL-SR-450-d9330.htm", userData: { label: "DETAIL" } },
    { url: "https://www.e-les.cz/stihl-topny-prvek-11414345130", userData: { label: "DETAIL" } },
    { url: "https://www.e-les.cz/stihl-topny-prvek-11404306004", userData: { label: "DETAIL" } }
  ]);
  t.is(productSlug("https://www.e-les.cz/"), null);
});

test("numeric snapshot identity survives a URL-style change; history uses the registry fallback", async t => {
  const document = await fixture("custom-slug");
  for (const url of [
    "https://www.e-les.cz/stihl-topny-prvek-11414345130",
    "https://www.e-les.cz/STIHL-topny-prvek-d22521.htm"
  ]) {
    const product = extractDetail(document, url);
    t.is(product.itemId, "22521");
    t.is(product.slug, itemSlug(url));
    t.is((await new ELes().scrape(document, url)).itemId, product.itemId);
  }
});

test("a custom Product with missing or malformed identity fails instead of inventing an ID", async t => {
  for (const snapshot of [null, "{}", "invalid", '{"product":{"id":"not-numeric"}}']) {
    const document = await fixture("custom-slug");
    const script = document.querySelector("#eshopDataLayerSnapshot");
    if (snapshot === null) script.remove();
    else script.textContent = snapshot;
    const url = productData(document).offers.url;
    t.throws(() => extractDetail(document, url));
    t.is(await new ELes().scrape(document, url), undefined);
  }
});

test("unpriced Products are skipped, but invalid priced Products fail", async t => {
  const document = await fixture("custom-slug");
  const script = document.querySelector("#product-json-ld");
  const data = JSON.parse(script.textContent);
  const product = data["@graph"].find(node => node["@type"] === "Product");
  const url = product.offers.url;
  delete product.offers.price;
  script.textContent = JSON.stringify(data);
  t.is(extractDetail(document, url), null);
  product.offers.price = "invalid";
  script.textContent = JSON.stringify(data);
  t.throws(() => extractDetail(document, url));
});

test("single-segment slugs preserve custom and legacy keys; nested paths are rejected", t => {
  t.is(productSlug("https://www.e-les.cz/custom-product/"), "custom-product");
  t.is(productSlug("https://www.e-les.cz/product-d9330.htm"), "9330");
  for (const path of ["category/custom-product", "category/product-d9330.htm"]) {
    t.is(productSlug(`https://www.e-les.cz/${path}`), null);
    t.is(itemSlug(`https://www.e-les.cz/${path}`), undefined);
  }
});

test("actor and extension survive changed build-hashed classes", async t => {
  const document = await fixture("discounted");
  for (const element of document.querySelectorAll("[class]")) {
    element.setAttribute("class", element.className.replace(/c\d+/g, "changed"));
  }
  const url = productData(document).offers.url;
  const product = extractDetail(document, url);
  const extension = new ELes();
  const info = await extension.scrape(document, url);
  t.is(product.originalPrice, 19190);
  t.is(Number(info.originalPrice), 19190);
  t.is(Number(info.currentPrice), 14990);
  t.is(info.title, product.itemName);
  t.truthy(document.querySelector(extension.injectionPoint[1]));
});

test("legacy reference markup remains a fallback", async t => {
  const document = await fixture("discounted");
  document.querySelector("[title]").removeAttribute("title");
  const url = productData(document).offers.url;
  t.is(extractDetail(document, url).originalPrice, 19190);
  t.is(Number((await new ELes().scrape(document, url)).originalPrice), 19190);
});
