import { readFile } from "node:fs/promises";
import { itemSlug } from "@hlidac-shopu/lib/shops.mjs";
import test from "ava";
import { childCategories, isOwnListing, pagesCount, productsFromListing, productWithVariants } from "./index.js";

const fixture = async name => JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

// `/v1/floors`, the sections of the home page
const floors = await fixture("floors");
// `/v1/category/18890188`, subcategories of the section Počítače a notebooky
const section = await fixture("section");
// `/v1/category/18842920`, subcategories of Notebooky
const category = await fixture("category");
// `/v2/products` of Notebooky (18842920), of its subcategory Herní (18848814)
// and of Plátna (18860069), which is a related category of Projektory (18843223)
const listing = await fixture("products");
const subcategoryListing = await fixture("products-subcategory");
const relatedListing = await fixture("products-related");
// `/api/router/legacy/catalog/product/7224775`, the detail of a product with variants
const detail = await fixture("product");

const shop = { currency: "CZK", priceDecimals: 0, inStock: /skladem/i };
const scrape = (handledIds = new Set()) => productsFromListing({ json: listing, shop, handledIds }).products;
const byId = (products, id) => products.find(x => x.itemId === id);

test("floors: promo listings are skipped, the category id is the one in the link", t => {
  t.deepEqual(childCategories(floors), [
    // "Připrav se na GTA VI" has the menu id 18925099, but links to the category 18923321
    { id: 18923321, section: true, related: false },
    { id: 18890259, section: true, related: false },
    { id: 18923375, section: false, related: false },
    { id: 18876334, section: false, related: false }
  ]);
});

test("section can contain another section", t => {
  t.deepEqual(childCategories(section), [
    { id: 18905185, section: false, related: false },
    { id: 18842920, section: false, related: false },
    { id: 18851089, section: true, related: false }
  ]);
});

test("subcategories: related categories are marked, promo and articles are skipped", t => {
  t.deepEqual(childCategories(category), [
    { id: 18924563, section: false, related: false },
    { id: 18911035, section: false, related: false },
    { id: 18843112, section: false, related: true }
  ]);
  t.deepEqual(childCategories({ data: null }), []);
});

test("subcategories: category listed as both own and related is related", t => {
  const link = {
    cat_type: "CATEGORY",
    self: { href: "https://m.alza.cz/x/v1/category/18861151", appLink: "catalogCategory" }
  };
  const json = {
    data: [
      { ...link, type: "sub" },
      { ...link, type: "related" }
    ]
  };
  t.deepEqual(childCategories(json), [{ id: 18861151, section: false, related: true }]);
});

test("topmost listing below the sections is paginated", t => {
  t.true(isOwnListing(listing));
  // a listing without breadcrumbs has no parent to contain it
  t.true(isOwnListing({ total: 3, data: [], breadcrumbs: [] }));
});

test("related category is paginated only when reached from its parent", t => {
  t.true(isOwnListing(relatedListing, 18843223));
  // the same category linked as related from another one, or from a section
  t.false(isOwnListing(relatedListing, 18842920));
  t.false(isOwnListing(relatedListing));
  t.false(isOwnListing(subcategoryListing));
});

test("pages have 25 products", t => {
  t.is(pagesCount(4345), 174);
  t.is(pagesCount(25), 1);
  t.is(pagesCount(26), 2);
});

test("product without a discount", t => {
  t.deepEqual(byId(scrape(), "13458347"), {
    itemId: "13458347",
    itemName: "HP Probook 4 G2a 14 (bez adaptéru) (3 roky servis)",
    itemUrl: "https://www.alza.cz/hp-probook-4-g2a-bez-adapteru-d13458347.htm",
    slug: "13458347",
    img: "https://image.alza.cz/products/HPBN1013w36/HPBN1013w36.jpg?width=190&height=190",
    inStock: true,
    currentPrice: 19990,
    originalPrice: null,
    discounted: false,
    currency: "CZK",
    itemCode: "HPBN1013w36",
    rating: 0,
    breadCrumbs: "Počítače a notebooky > Notebooky"
  });
});

test("discounted product has the struck-through price as the original one", t => {
  t.like(byId(scrape(), "13436021"), { currentPrice: 8990, originalPrice: 10990, discounted: true });
});

test("current price is rounded as the displayed one", t => {
  // "36 117,-" for 36116.5
  t.like(byId(scrape(), "13105563"), { currentPrice: 36117, originalPrice: 42490, discounted: true });
});

test("current price of a product with a quantity discount is the price of one piece", t => {
  // 6845880 is 465,- a piece, 454,- from 2 pieces and 442,- from 3 pieces
  const json = { data: [{ ...listing.data[0], price: "od\u00a0442,-", priceNoCurrency: 465.4, cprice: null }] };
  const { products } = productsFromListing({ json, shop, handledIds: new Set() });
  t.like(products[0], { currentPrice: 465, originalPrice: null });
});

test("price with a discount code is the current one, as in the extension", t => {
  // 13341165 costs 999,- or 749,- with the code 2026ALZAEXTRA25
  const code = { type: 2, price: "749,-", label: "Koupit s kódem 2026ALZAEXTRA25", sublabel: "2026ALZAEXTRA25" };
  const item = { ...listing.data[0], price: "999,-", priceNoCurrency: 999, cprice: null };
  const prices = cashBackItems => {
    const json = { data: [{ ...item, cashBackItems }] };
    return productsFromListing({ json, shop, handledIds: new Set() }).products[0];
  };
  t.like(prices([code]), { currentPrice: 749, originalPrice: 999, discounted: true });
  t.like(prices([{ ...code, price: "1\u00a0199,-" }]), { currentPrice: 999, originalPrice: null });
  // AlzaPlus+ (4), a trade-in bonus (3) and a cashback (0, 1) are not the price of everybody
  for (const type of [0, 1, 3, 4]) {
    t.like(prices([{ ...code, type }]), { currentPrice: 999, originalPrice: null, discounted: false });
  }
});

test("original price which is not higher than the current one is dropped", t => {
  const json = { data: [{ ...listing.data[0], price: "859,-", priceNoCurrency: 859, cprice: "859,-" }] };
  const { products } = productsFromListing({ json, shop, handledIds: new Set() });
  t.like(products[0], { currentPrice: 859, originalPrice: null, discounted: false });
});

test("product with variants has the price of its page, not the one of the listing", t => {
  // the listing has "od 109,-", the page shows the variant Mandlový krém for 203,-
  const item = {
    ...listing.data[0],
    id: 7224775,
    url: "https://www.alza.cz/sport/natu-arasidovy-krem-300-g_1",
    variant_type: 1,
    avail: "Skladem dle varianty",
    price: "od\u00a0109,-",
    priceNoCurrency: 139,
    cprice: "139,-"
  };
  const { products, withVariants } = productsFromListing({ json: { data: [item] }, shop, handledIds: new Set() });
  t.deepEqual(products, []);
  t.is(withVariants.length, 1);
  t.like(productWithVariants({ product: withVariants[0], json: detail, shop }), {
    itemId: "7224775",
    itemUrl: "https://www.alza.cz/sport/natu-arasidovy-krem-300-g_1",
    slug: "natu-arasidovy-krem-300-g_1",
    inStock: true,
    currentPrice: 203,
    originalPrice: 239,
    discounted: true
  });
  t.is(productWithVariants({ product: withVariants[0], json: { data: null }, shop }), null);
});

test("slug is the one the API derives from the URL", t => {
  const products = scrape();
  for (const product of products) {
    t.is(product.slug, itemSlug(product.itemUrl));
    t.is(product.slug, product.itemId);
  }
  t.is(byId(products, "12349143").itemUrl, "https://www.alza.cz/microsoft-surface-laptop-copilot-pc?dq=12349143");
});

test("in stock is a product in a warehouse of Alza or of its supplier", t => {
  const products = scrape();
  t.true(byId(products, "13458347").inStock); // Skladem > 5 ks
  t.true(byId(products, "13551804").inStock); // Skladem u dodavatele
  t.false(byId(products, "13014022").inStock); // Již brzy
  const { products: sk } = productsFromListing({
    json: {
      data: [
        {
          ...listing.data[0],
          avail: "Na sklade > 5\u00a0ks u dodávateľa",
          price: "448,90\u00a0€",
          priceNoCurrency: 448.9
        }
      ]
    },
    shop: { currency: "EUR", priceDecimals: 2, inStock: /na sklade/i },
    handledIds: new Set()
  });
  t.like(sk[0], { inStock: true, currentPrice: 448.9, currency: "EUR" });
});

test("product without a displayed price is skipped", t => {
  const json = { ...listing, data: [{ ...listing.data[0], price: null, avail: "Momentálně nedostupné" }] };
  t.deepEqual(productsFromListing({ json, shop, handledIds: new Set() }), { products: [], withVariants: [] });
});

test("product is saved once, the listings overlap", t => {
  const handledIds = new Set();
  t.is(scrape(handledIds).length, listing.data.length);
  t.is(scrape(handledIds).length, 0);
  t.is(handledIds.size, listing.data.length);
});
