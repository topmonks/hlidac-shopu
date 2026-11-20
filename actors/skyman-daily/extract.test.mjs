import { readFile } from "node:fs/promises";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { Skyman } from "../../extension/shops/skyman.mjs";
import { itemSlug } from "../../lib/shops.mjs";
import { extractProducts, productSlug, sitemapRequests } from "./extract.js";

async function fixture(name) {
  return parseHTML(await readFile(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8")).document;
}

for (const [name, price, original] of [
  ["discounted", 1996, 2852],
  ["regular", 9438, null]
]) {
  test(`${name}: actor and extension use the same VAT-inclusive price`, async t => {
    const document = await fixture(name);
    const url = document.querySelector('article > meta[itemprop="url"]').getAttribute("content");
    const [product] = extractProducts(document, url);
    t.like(product, { currentPrice: price, originalPrice: original, discounted: original !== null, currency: "CZK" });
    t.truthy(product.itemId);
    t.truthy(product.img);
    t.truthy(product.category);
    t.is(product.slug, itemSlug(url));
    const extension = new Skyman();
    const info = await extension.scrape(document, url);
    t.is(info.itemId, product.slug);
    t.is(Number(info.currentPrice), price);
    t.is(info.originalPrice === null ? null : Number(info.originalPrice), original);
    t.is(info.title, product.itemName);
    t.is(info.imageUrl, product.img);
    t.truthy(document.querySelector(extension.injectionPoint[1]));
  });
}

for (const name of ["variants", "discounted-variants"]) {
  test(`${name}: each hash variant has its own matching history key and price`, async t => {
    const document = await fixture(name);
    const url = document.querySelector('article > meta[itemprop="url"]').getAttribute("content");
    const products = extractProducts(document, url);
    t.true(products.length > 1);
    for (const product of products.slice(1)) {
      const info = await new Skyman().scrape(document, product.itemUrl);
      t.is(product.slug, itemSlug(product.itemUrl));
      t.is(info.itemId, product.slug);
      t.is(Number(info.currentPrice), product.currentPrice);
      t.is(info.originalPrice, null);
      t.is(product.originalPrice, null);
      t.is(info.imageUrl, product.img);
      t.truthy(product.itemId);
    }
    t.is(await new Skyman().scrape(document, `${url}#999999999`), undefined);
  });
}

test("only Czech products and product sitemaps are followed", t => {
  const { document } = parseXML(`<sitemapindex>
    <sitemap><loc>https://www.skyman.cz/sitemap-products.xml.gz</loc></sitemap>
    <sitemap><loc>https://www.skyman.cz/sitemap-articles.xml.gz</loc></sitemap>
    <sitemap><loc>https://example.com/sitemap-products.xml.gz</loc></sitemap>
  </sitemapindex>`);
  t.deepEqual(sitemapRequests(document), [
    { url: "https://www.skyman.cz/sitemap-products.xml.gz", userData: { label: "SITEMAP" } }
  ]);
  const xml = parseXML(`<urlset>
    <url><loc>https://www.skyman.cz/p/mechanicky-prusik-isc-reflex-v2</loc></url>
    <url><loc>https://www.skyman.cz/sk/p/reflex</loc></url>
    <url><loc>https://www.skyman.cz/arboristika</loc></url>
  </urlset>`).document;
  t.is(sitemapRequests(xml).length, 1);
  t.is(productSlug("https://www.skyman.cz/p/reflex/?utm_source=test#42"), "reflex-42");
});

test("missing product data fails the actor and is ignored by the extension", async t => {
  const { document } = parseHTML("<h1>Category</h1>");
  const url = "https://www.skyman.cz/p/reflex";
  t.throws(() => extractProducts(document, url));
  t.is(await new Skyman().scrape(document, url), undefined);
});

test("numeric variant paths and hash links resolve to the same saved variant", async t => {
  const document = await fixture("selected-variant");
  const url = document.querySelector('article > meta[itemprop="url"]').getAttribute("content");
  const products = extractProducts(document, url);
  t.is(products.length, 1);
  t.is(products[0].slug, "karabina-s-otocnym-zavesem-dmm-xsre-swivel-11-mm-eye-18069");
  t.is(itemSlug(url), products[0].slug);
  const info = await new Skyman().scrape(document, url);
  t.is(info.itemId, products[0].slug);
  t.is(Number(info.currentPrice), products[0].currentPrice);
});

test("sitemap variant URLs are grouped by parent without losing their IDs", t => {
  const { document } = parseXML(`<urlset>
    <url><loc>https://www.skyman.cz/p/reflex</loc></url>
    <url><loc>https://www.skyman.cz/p/reflex/12</loc></url>
    <url><loc>https://www.skyman.cz/p/reflex/13</loc></url>
    <url><loc>https://www.skyman.cz/p/reflex/13</loc></url>
  </urlset>`);
  t.deepEqual(sitemapRequests(document), [
    {
      url: "https://www.skyman.cz/p/reflex",
      userData: { label: "DETAIL", variantIds: ["12", "13"] }
    }
  ]);
});
