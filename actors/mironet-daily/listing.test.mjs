import { readFile } from "node:fs/promises";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { BF_URL, Labels, listingItems, pageUrls, startingRequest } from "./listing.js";

const html = await readFile(new URL("./fixtures/black-friday.html", import.meta.url), "utf8");
const { document } = parseHTML(html);
const rootUrl = "https://www.mironet.cz";

test("Black Friday run starts on the Black Friday page as a paginated listing (#3673)", t => {
  t.deepEqual(startingRequest({ type: ActorType.BlackFriday, urls: [] }), {
    url: BF_URL,
    userData: { label: Labels.Page, baseUrl: BF_URL }
  });
});

test("bfUrl from the input replaces the Black Friday page", t => {
  const bfUrl = `${BF_URL}&sort=3`;
  t.deepEqual(startingRequest({ type: ActorType.BlackFriday, urls: [], bfUrl }).userData, {
    label: Labels.Page,
    baseUrl: bfUrl
  });
});

test("first page queues the remaining pages, keeping the Black Friday filter", t => {
  const urls = pageUrls({ document, baseUrl: BF_URL });
  t.is(urls.length, 149);
  t.is(urls[0], "https://www.mironet.cz/vyprodej/?v=black-friday&PgID=2");
  t.is(urls.at(-1), "https://www.mironet.cz/vyprodej/?v=black-friday&PgID=150");
});

test("listing products with and without a crossed-out price", t => {
  t.deepEqual(listingItems({ document, rootUrl }), [
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

test("full run still starts from the category sitemap", t => {
  t.is(startingRequest({ type: ActorType.Full, urls: [] }).userData.label, Labels.Categories);
});
