import { readFile } from "node:fs/promises";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import {
  BF_URL,
  itemCount,
  Labels,
  lastPage,
  listingItems,
  pageCount,
  pageUrl,
  rootCategories,
  startingRequests
} from "./listing.js";

const fixture = name => readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const rootUrl = "https://www.mironet.cz";
const categoryUrl = "https://www.mironet.cz/graficke-karty+c14402/";

const bfHtml = await fixture("black-friday.html");
const bf = parseHTML(bfHtml).document;
const categoryHtml = await fixture("category-page-4.html");
const category = parseHTML(categoryHtml).document;

test("Black Friday run starts on the Black Friday page as a paginated listing (#3673)", t => {
  t.deepEqual(startingRequests({ type: ActorType.BlackFriday, urls: [] }), [
    { url: BF_URL, userData: { label: Labels.Page, baseUrl: BF_URL } }
  ]);
});

test("bfUrl from the input replaces the Black Friday page", t => {
  const bfUrl = `${BF_URL}&sort=3`;
  t.is(startingRequests({ type: ActorType.BlackFriday, urls: [], bfUrl })[0].userData.baseUrl, bfUrl);
});

test("full run starts from the category sitemap, or from the given categories", t => {
  t.is(startingRequests({ type: ActorType.Full, urls: [] })[0].userData.label, Labels.Categories);
  t.deepEqual(startingRequests({ type: ActorType.Full, urls: [categoryUrl, { url: `${rootUrl}/x+c1/` }] }), [
    { url: categoryUrl, userData: { label: Labels.Page, baseUrl: categoryUrl } },
    { url: `${rootUrl}/x+c1/`, userData: { label: Labels.Page, baseUrl: `${rootUrl}/x+c1/` } }
  ]);
});

test("only top-level categories of the sitemap are scraped, they list their subcategories' products", t => {
  const sitemap = [
    "https://www.mironet.cz",
    "https://www.mironet.cz/procesory+c14398/",
    "https://www.mironet.cz/procesory/amd+c14413/",
    "https://www.mironet.cz/procesory/amd/socket-am4/ryzen-5+c36002/",
    // its parent `/kancelar-a-papirnictvi+c…/` is not in the sitemap, so it is a top-level category itself
    "https://www.mironet.cz/kancelar-a-papirnictvi/papir+c123/",
    "https://www.mironet.cz/kancelar-a-papirnictvi/papir/kancelarsky+c124/"
  ];
  t.deepEqual(rootCategories(sitemap), [
    "https://www.mironet.cz",
    "https://www.mironet.cz/procesory+c14398/",
    "https://www.mironet.cz/kancelar-a-papirnictvi/papir+c123/"
  ]);
});

test("page count comes from the number of products, the pagination links stop at page 416", t => {
  const items = Array.from({ length: 24 }, (_, i) => `<div class="item_b"><span class="item-code">${i}</span></div>`);
  const page = (count, lastLink) =>
    parseHTML(
      `<div id="ItemCount" class="NoPrint"> ${count} produktů </div>${items.join("")}` +
        `<div class="pagination"><a class="mirbtn">${lastLink}</a></div>`
    ).document;
  // https://www.mironet.cz/puzzle+c35623/ (7. 11. 2026): 13 836 products, links up to 416, page 577 has the last 12
  t.is(itemCount(page(13836, 416)), 13836);
  t.is(lastPage(page(13836, 416)), 577);
  t.is(lastPage(page(382, 16)), 16);
  t.is(lastPage(page(24, 1)), 1);
  t.is(lastPage(bf), 150, "without the number of products the pagination links decide");
});

test("pagination keeps the Black Friday filter", t => {
  t.is(pageCount(bf), 150);
  t.is(pageUrl(BF_URL, 2), "https://www.mironet.cz/vyprodej/?v=black-friday&PgID=2");
});

test("listing products with and without a crossed-out price", t => {
  t.deepEqual(listingItems({ document: bf, rootUrl }), [
    {
      img: "https://www.mironet.cz/Foto/s3/96141244.webp",
      itemId: "96141244",
      itemUrl: "https://www.mironet.cz/samsung-efvs936pje-kindsuit-kryt-pro-samsung-galaxy-s25-seda+dp769281/",
      itemName: "Samsung EF-VS936PJE KindSuit Kryt pro Samsung Galaxy S25+ šedá",
      discounted: true,
      currentPrice: 208,
      originalPrice: 1039,
      breadCrumbs: ["Výprodej", "Black Friday"]
    },
    {
      img: "https://www.mironet.cz/Foto/s3/92465522.webp",
      itemId: "92465522",
      itemUrl:
        "https://www.mironet.cz/transcend-mts830s-256gb-m2-2280-sata-rw-530400-mbps-iops-45k75k-mtbf-20mh-3y+dp669802/",
      itemName: "Transcend MTS830S 256GB",
      discounted: false,
      currentPrice: 3168,
      breadCrumbs: ["Výprodej", "Black Friday"]
    }
  ]);
});

test("regular category pages yield products and breadcrumbs", t => {
  const items = listingItems({ document: category, rootUrl });
  t.is(items.length, 2);
  t.deepEqual(items[0].breadCrumbs, ["Komponenty", "Grafické karty"]);
});
