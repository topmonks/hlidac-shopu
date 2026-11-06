import { readFile } from "node:fs/promises";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import {
  ajaxCategoryId,
  ajaxPageItems,
  ajaxPageRequest,
  BF_URL,
  fallbackPageRequest,
  Labels,
  listingItems,
  pageCount,
  pageUrl,
  readBreadCrumbs,
  startingRequests
} from "./listing.js";

const fixture = name => readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const rootUrl = "https://www.mironet.cz";
const categoryUrl = "https://www.mironet.cz/graficke-karty+c14402/";

const bfHtml = await fixture("black-friday.html");
const bf = parseHTML(bfHtml).document;
// regular page 4 of a category and the same page from the AJAX endpoint (6. 11. 2026)
const categoryHtml = await fixture("category-page-4.html");
const category = parseHTML(categoryHtml).document;
const categoryAjax = await fixture("category-page-4-ajax.json");

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

test("only plain categories are loaded through AJAX, by the id from the page", t => {
  t.is(ajaxCategoryId(categoryHtml, categoryUrl), "14402");
  t.is(ajaxCategoryId(categoryHtml, BF_URL), null, "Black Friday page keeps its filter, regular pages only");
  t.is(ajaxCategoryId(bfHtml, categoryUrl), null, "page without a category id");
});

test("AJAX request sends the header the endpoint needs and carries the breadcrumbs", t => {
  const breadCrumbs = readBreadCrumbs(category);
  t.deepEqual(ajaxPageRequest({ catId: "14402", page: 4, baseUrl: categoryUrl, breadCrumbs }), {
    url: "https://www.mironet.cz/Ajax/axmoreprod?ScriptName=default&CatId=14402&PgID=1&nNext=4",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    userData: { label: Labels.AjaxPage, baseUrl: categoryUrl, page: 4, breadCrumbs: ["Komponenty", "Grafické karty"] }
  });
});

test("AJAX page gives the same products as the regular page", t => {
  const regular = listingItems({ document: category, rootUrl });
  const ajax = ajaxPageItems({ statusCode: 200, body: categoryAjax, rootUrl, breadCrumbs: readBreadCrumbs(category) });
  t.is(regular.length, 2);
  t.deepEqual(ajax, regular);
});

test("unusable AJAX answers fall back to the regular page", t => {
  const breadCrumbs = [];
  t.is(ajaxPageItems({ statusCode: 400, body: "", rootUrl, breadCrumbs }), null, "error status");
  t.is(ajaxPageItems({ statusCode: 200, body: "<html>", rootUrl, breadCrumbs }), null, "not JSON");
  t.is(ajaxPageItems({ statusCode: 200, body: '{"html":""}', rootUrl, breadCrumbs }), null, "no products");
  t.is(ajaxPageItems({ statusCode: 200, body: "{}", rootUrl, breadCrumbs }), null, "no html");
  t.deepEqual(fallbackPageRequest({ baseUrl: categoryUrl, page: 4, breadCrumbs }), {
    url: "https://www.mironet.cz/graficke-karty+c14402/?PgID=4",
    userData: { label: Labels.Pages, baseUrl: categoryUrl }
  });
});
