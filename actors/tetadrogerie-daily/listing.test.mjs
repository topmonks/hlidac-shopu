import { readFile } from "node:fs/promises";
import test from "ava";
import { changeListingUrlPage, listingApiUrl, parseItems } from "./listing.js";

const api = "https://be.tetadrogerie.cz/api/v2/shop/search/products-variants";
const bfUrl = "https://www.tetadrogerie.cz/akce/detail/sn26bf0001";

test("promotion page is a listing, its products come from the API by action (#3678)", t => {
  t.is(listingApiUrl(bfUrl), `${api}?action=sn26bf0001&page=1&itemsPerPage=40&sort=asc&order_by=price&strana=1`);
});

test("category page is a listing, its products come from the API by taxon", t => {
  t.is(
    listingApiUrl("https://www.tetadrogerie.cz/eshop/produkty/hubeni-hmyzu"),
    `${api}?taxon=hubeni-hmyzu&page=1&itemsPerPage=40&sort=asc&order_by=price&strana=1`
  );
});

test("page number of a paginated listing goes to the API", t => {
  const page3 = changeListingUrlPage(bfUrl, 3);
  t.is(page3, `${bfUrl}?page=3&strana=3`);
  t.is(listingApiUrl(page3), `${api}?action=sn26bf0001&page=3&itemsPerPage=40&sort=asc&order_by=price&strana=3`);
});

test("other pages are not listings", t => {
  t.is(listingApiUrl("https://www.tetadrogerie.cz/eshop/"), null);
  t.is(listingApiUrl("https://www.tetadrogerie.cz/eshop/katalog/missha-airy-fit-aloe-maska"), null);
  t.is(listingApiUrl("https://www.tetadrogerie.cz/akce"), null);
});

test("products of the Black Friday promotion", async t => {
  // first 2 products of `action=sn26bf0001` (10. 11. 2026)
  const json = JSON.parse(await readFile(new URL("./fixtures/black-friday-products.json", import.meta.url), "utf8"));
  t.is(json.pagination.totalItems, 201);
  t.deepEqual(parseItems(json), [
    {
      itemId: "301223",
      itemName: "MISSHA Airy Fit Aloe pleťová maska 1 ks",
      img: "https://teta-drogerie.fra1.digitaloceanspaces.com/cache/inveocz_product_gallery/d9/3d/93a93e2e93cf4c11b34dfb13e8e7.png",
      slug: "missha-airy-fit-aloe-maska",
      itemUrl: "https://www.tetadrogerie.cz/eshop/katalog/missha-airy-fit-aloe-maska",
      currentPrice: 24.9,
      originalPrice: 49.9,
      discounted: true,
      inStock: true,
      category: "Pleť > Pleťové masky > Masky na pleť"
    },
    {
      itemId: "226879",
      itemName: "Miss Sporty lak na nehty 1 Min to Shine 010",
      img: "https://teta-drogerie.fra1.digitaloceanspaces.com/cache/inveocz_product_gallery/6a/db/75fa671a1407496a5cc59d245c8a.png",
      slug: "miss-sporty-lak-1-min-to-shine-010",
      itemUrl: "https://www.tetadrogerie.cz/eshop/katalog/miss-sporty-lak-1-min-to-shine-010",
      currentPrice: 24.9,
      originalPrice: 49.9,
      discounted: true,
      inStock: false,
      category: "Krása a parfémy > Nehty > Laky na nehty"
    }
  ]);
});
