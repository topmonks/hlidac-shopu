import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { hasBlackFridayBadge, isProductUrl } from "./index.js";

// Badge blocks copied from real pilulka.cz product pages (November 2026).
const badges = items =>
  `<div class="product-detail"><div class="product-badges" data-v-0e6adffd><!--[-->${items
    .map(
      ([id, text]) =>
        `<div badge-id="${id}" class="item" style="background-color:#000000;color:#FFFFFF;" data-v-0e6adffd>${text}</div>`
    )
    .join("")}<!--]--><!--[--><!--]--></div></div>`;

const menu = `<li class="menu__item"><a class="menu__link menu__href" href="/black-friday"><span>Black Friday</span></a></li>`;

const hasBadge = html => hasBlackFridayBadge(parseHTML(`<html><body>${menu}${html}</body></html>`).document);

test("a product with the Black Friday badge is a Black Friday product", t => {
  t.true(hasBadge(badges([[16, "Black Friday"]])));
});

test("the Black Friday badge is found among other badges", t => {
  t.true(
    hasBadge(
      badges([
        [34, "Krátká expirace"],
        [16, "Black Friday"],
        [10, "Bez laktózy"]
      ])
    )
  );
});

test("other badges and the Black Friday menu link do not count", t => {
  t.false(hasBadge(badges([[19, "Novinka"]])));
  t.false(hasBadge(`<div class="product-detail"></div>`));
});

test("leaflet and reviews tabs are not product pages", t => {
  t.true(isProductUrl("https://www.pilulka.cz/gymbeam-omega-3-6-9-unflavored-60-kaps"));
  t.true(isProductUrl("https://www.pilulka.cz/product/1001659315"));
  t.false(isProductUrl("https://www.pilulka.cz/gymbeam-omega-3-6-9-unflavored-60-kaps/pribalovy-letak"));
  t.false(isProductUrl("https://www.pilulka.cz/product/1001659315/recenze-zkusenosti"));
});
