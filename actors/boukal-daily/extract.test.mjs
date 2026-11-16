import { readFile } from "node:fs/promises";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { Boukal } from "../../extension/shops/boukal.mjs";
import { itemSlug } from "../../lib/shops.mjs";
import { extractDetail, productSlug, sitemapRequests } from "./extract.js";

async function fixture(name) {
  return parseHTML(await readFile(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8")).document;
}

for (const [name, price, inStock] of [
  ["regular", 199.65, true],
  ["campaign", 7300, true],
  ["out-of-stock", 16.77, false]
]) {
  test(`${name}: actor and extension agree; data-contentold is not a discount`, async t => {
    const document = await fixture(name);
    const url = document.querySelector('.preBuy_box [itemprop="url"]').getAttribute("content");
    const product = extractDetail(document, url);
    t.like(product, { currentPrice: price, originalPrice: null, discounted: false, currency: "CZK", inStock });
    t.truthy(product.itemId);
    t.truthy(product.category);
    t.is(product.slug, itemSlug(url));
    const extension = new Boukal();
    const info = await extension.scrape(document, url);
    t.is(info.itemId, product.slug);
    t.is(Number(info.currentPrice), price);
    t.is(info.originalPrice, null);
    t.is(info.title, product.itemName);
    t.is(info.imageUrl, product.img);
    t.truthy(document.querySelector(extension.injectionPoint[1]));
  });
}

test("prices and stock on recommended products do not affect the main product", async t => {
  const document = await fixture("out-of-stock");
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div><h1>Recommended</h1>
    <span itemprop="price" content="999"></span><link itemprop="availability" href="https://schema.org/InStock"></div>`
  );
  const url = document.querySelector('.preBuy_box [itemprop="url"]').getAttribute("content");
  t.like(extractDetail(document, url), { currentPrice: 16.77, inStock: false, img: null });
  t.is(Number((await new Boukal().scrape(document, url)).currentPrice), 16.77);
});

test("only product sitemaps on the expected host are followed", t => {
  const { document } = parseXML(`<sitemapindex>
    <sitemap><loc>https://www.boukal.cz/sitemap-products-1.xml</loc></sitemap>
    <sitemap><loc>https://www.boukal.cz/sitemap-products-2.xml</loc></sitemap>
    <sitemap><loc>https://www.boukal.cz/sitemap-images-1.xml</loc></sitemap>
    <sitemap><loc>https://www.boukal.cz/sitemap-category-1.xml</loc></sitemap>
    <sitemap><loc>https://example.com/sitemap-products-1.xml</loc></sitemap>
  </sitemapindex>`);
  t.deepEqual(
    sitemapRequests(document).map(request => request.url),
    ["https://www.boukal.cz/sitemap-products-1.xml", "https://www.boukal.cz/sitemap-products-2.xml"]
  );
});

test("missing product or price fails the actor and is ignored by the extension", async t => {
  for (const html of [
    "<h1>Category</h1>",
    '<div class="product_detail"><h1 id="productTitlePc">Unavailable</h1></div>'
  ]) {
    const { document } = parseHTML(html);
    const url = "https://www.boukal.cz/product-code";
    t.throws(() => extractDetail(document, url));
    t.is(await new Boukal().scrape(document, url), undefined);
  }
});

test("legacy nested product paths keep the final segment as history key", t => {
  const url = "https://www.boukal.cz/naradi_c1/rucni-naradi_c2/racna-stahl12110020_p252339";
  t.is(productSlug(url), "racna-stahl12110020_p252339");
  t.is(productSlug(url), itemSlug(url));
  t.is(sitemapRequests(parseXML(`<urlset><url><loc>${url}</loc></url></urlset>`).document).length, 1);
});

test("a real unpriced catalogue entry is skipped instead of aborting the catalogue", async t => {
  const document = await fixture("unpriced");
  const url = "https://www.boukal.cz/vernostni-program-vernostni-program";
  t.is(extractDetail(document, url), null);
  t.is(await new Boukal().scrape(document, url), undefined);
});

test("product sitemap entries exclude obvious categories, account pages and foreign URLs", t => {
  const urls = [
    "https://www.boukal.cz/kontakty",
    "https://www.boukal.cz/naradi_c4801773437725",
    "https://www.boukal.cz/vernostni-program-vernostni-program",
    "https://www.boukal.cz/prihlaseni",
    "https://example.com/product-code",
    "https://www.boukal.cz/product-code?s=1",
    "https://www.boukal.cz/bessey-dbk-l-vymenna-cepel-na-linoleum-bes-dbk-l"
  ];
  const { document } = parseXML(`<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
  t.deepEqual(
    sitemapRequests(document).map(request => request.url),
    [urls.at(-1)]
  );
});
