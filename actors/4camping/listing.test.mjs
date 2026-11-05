import { readFile } from "node:fs/promises";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { listingPageUrls, listingProductUrls } from "./listing.js";

const html = await readFile(new URL("./fixtures/black-friday-listing.html", import.meta.url), "utf8");
const { document } = parseHTML(html);
const pageUrl = "https://www.4camping.cz/c/black-friday/";

test("product tiles become product detail URLs without the variant hash", t => {
  t.deepEqual(listingProductUrls(document, pageUrl), [
    "https://www.4camping.cz/p/ponozky-zulu-merino-allseason-3-pack/",
    "https://www.4camping.cz/p/perovy-spacak-warg-stark-650-l/",
    "https://www.4camping.cz/p/panska-bunda-kilpi-metrix-m-1/"
  ]);
});

test("first page queues the remaining pages of the category", t => {
  const pages = listingPageUrls(document, pageUrl);
  t.is(pages.length, 421);
  t.is(pages[0], "https://www.4camping.cz/c/black-friday/?p=2");
  t.is(pages.at(-1), "https://www.4camping.cz/c/black-friday/?p=422");
});

test("other pages do not queue pagination again", t => {
  t.deepEqual(listingPageUrls(document, `${pageUrl}?p=2`), []);
});

test("category without pagination has no other pages", t => {
  const { document } = parseHTML('<a href="/p/x/#y">x</a>');
  t.deepEqual(listingPageUrls(document, pageUrl), []);
});
