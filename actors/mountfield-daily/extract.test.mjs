import { readFile } from "node:fs/promises";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { Country, categoryLinks, extractDetail, listingItems, pageUrls, sitemapUrls, variantUrls } from "./extract.js";

const fixture = name => readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const html = async name => parseHTML(await fixture(`${name}.html`)).document;
const xml = async name => parseXML(await fixture(`${name}.xml`)).document;

test("sitemap index lists the page and image sitemaps", async t => {
  t.deepEqual(sitemapUrls(await xml("sitemap-index")), [
    "https://www.mountfield.cz/content/sitemaps/domain_1_sitemap.1.xml",
    "https://www.mountfield.cz/content/sitemaps/domain_1_sitemap.image_1.xml"
  ]);
});

test("image sitemap: product pages are kept, also with a slash in the path, category pages are skipped", async t => {
  t.deepEqual(pageUrls(await xml("sitemap-image")), [
    "https://www.mountfield.cz/aku-plotove-nuzky-ikra-iahs-40-5425-1aku1002",
    "https://www.mountfield.cz/aku-fukar/vysavac-greenworks-gd40bv-40v-1aku2017"
  ]);
});

test("page sitemap: products without an image are kept, magazine articles are skipped (#3641)", async t => {
  t.deepEqual(pageUrls(await xml("sitemap")), [
    "https://www.mountfield.cz/kontakt",
    "https://www.mountfield.cz/lampa-uv-c-tech-40w-vgf980042"
  ]);
});

test("detail: product filed directly under Náhradní díly, the club price is not the current price (#3641)", async t => {
  t.deepEqual(extractDetail(await html("detail-club-price"), Country.CZ, "https://example.com/"), {
    id: "ub281434s",
    itemId: "ub281434s",
    itemUrl: "https://www.mountfield.cz/rukojet-startovani-ub281434s",
    itemName: "Rukojeť startování",
    currentPrice: 145,
    originalPrice: null,
    discounted: false,
    loyalty: false,
    category: " > Náhradní díly",
    currency: "CZK",
    img: "https://cdn.mountfield.cz/content/images/product/list/5415.jpg"
  });
});

test("detail: struck-through price is the original price, the Věrná tlapka price is ignored", async t => {
  t.like(extractDetail(await html("detail-old-price"), Country.CZ, "https://example.com/"), {
    itemId: "2krm1241",
    currentPrice: 28,
    originalPrice: 35,
    discounted: true
  });
});

test("detail: recommended retail price is the original price", async t => {
  t.like(extractDetail(await html("detail-recommended-price"), Country.CZ, "https://example.com/"), {
    itemId: "1aku3054",
    currentPrice: 1350,
    originalPrice: 2600,
    discounted: true
  });
});

test("detail: product not sold online takes the price from the dataLayer", async t => {
  t.like(extractDetail(await html("detail-not-sold-online"), Country.CZ, "https://example.com/"), {
    itemId: "2dss6038",
    currentPrice: 515,
    originalPrice: null
  });
});

test("detail: variant has its own name and price, and links to the other sizes (#3641)", async t => {
  const document = await html("detail-variants");
  t.like(extractDetail(document, Country.CZ, "https://example.com/"), {
    itemId: "4koz3139",
    itemName: "Cyklistický dres ELITE 13 vel. S, dámský",
    currentPrice: 430,
    originalPrice: 880
  });
  t.deepEqual(variantUrls(document), [
    "https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-s-damsky-4koz3139",
    "https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-xl-damsky-4koz3142",
    "https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-l-damsky-4koz3141",
    "https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-m-damsky-4koz3140",
    "https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-xxl-damsky-4koz3166"
  ]);
});

test("detail: Slovak prices in euros", async t => {
  t.like(extractDetail(await html("detail-sk"), Country.SK, "https://example.com/"), {
    itemId: "4koe25023",
    currentPrice: 1120,
    originalPrice: 2080,
    currency: "EUR"
  });
});

test("category pages are not products", async t => {
  t.is(extractDetail(await html("category"), Country.CZ, "https://example.com/"), null);
  t.is(extractDetail(await html("category-without-products"), Country.CZ, "https://example.com/"), null);
});

test("category links: products of a listing (#3641)", async t => {
  t.deepEqual(categoryLinks(await html("category"), "https://www.mountfield.cz/vanocni-osvetleni-posledni-sance"), {
    categories: [],
    products: [
      "https://www.mountfield.cz/transformator-31v-6w-ip44-9vad1589",
      "https://www.mountfield.cz/keramicky-domek-se-zelenou-strechou-12x8-3x16-3-cm-led-9vad1906"
    ],
    variants: [],
    nextPage: null
  });
});

test("category links: variant cards are kept apart, next page", async t => {
  t.deepEqual(categoryLinks(await html("listing"), "https://www.mountfield.cz/cyklo-obleceni"), {
    categories: [],
    products: ["https://www.mountfield.cz/cyklisticke-ponozky-mtf-vel-35-38-4koz3160"],
    variants: ["https://www.mountfield.cz/cyklisticky-dres-elite-13-vel-s-damsky-4koz3139"],
    nextPage: "https://www.mountfield.cz/cyklo-obleceni?page=2"
  });
});

test("listing: recommended retail price is the original price, variant cards are skipped", async t => {
  t.deepEqual(listingItems(await html("listing"), Country.CZ), [
    {
      id: "4koz3160",
      itemId: "4koz3160",
      itemUrl: "https://www.mountfield.cz/cyklisticke-ponozky-mtf-vel-35-38-4koz3160",
      itemName: "Cyklistické ponožky MTF vel. 35-38",
      currentPrice: 139,
      originalPrice: 270,
      discounted: true,
      loyalty: false,
      category: " > Elektrokola > Cyklooblečení a helmy",
      currency: "CZK",
      img: "https://cdn.mountfield.cz/content/images/product/list/112656.jpg"
    }
  ]);
});

test("listing: the club price is not the current price", async t => {
  t.like(listingItems(await html("listing-club-price"), Country.CZ)[0], {
    itemId: "dy26800705102",
    currentPrice: 7,
    originalPrice: null,
    discounted: false,
    loyalty: false
  });
});

test("listing: products of a category not linked from the root listing (#3641)", async t => {
  t.deepEqual(
    listingItems(await html("category"), Country.CZ).map(item => [item.itemId, item.currentPrice, item.category]),
    [
      ["9vad1589", 300, " > Vánoce > Vánoční osvětlení > Poslední šance"],
      ["9vad1906", 310, " > Vánoce > Vánoční osvětlení > Poslední šance"]
    ]
  );
});

test("listing: a page with only subcategories has no products", async t => {
  t.deepEqual(listingItems(await html("category-without-products"), Country.CZ), []);
});

test("category links: subcategories of a page without products", async t => {
  t.deepEqual(categoryLinks(await html("category-without-products"), "https://www.mountfield.cz/nahradni-dily"), {
    categories: [
      "https://www.mountfield.cz/nahradni-dily-pro-sekacky",
      "https://www.mountfield.cz/nahradni-dily-pro-zahradni-traktory-a-ridery",
      "https://www.mountfield.cz/nahradni-dily-pro-retezove-pily-a-jejich-prislusenstvi"
    ],
    products: [],
    variants: [],
    nextPage: null
  });
});
