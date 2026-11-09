import { readFile } from "node:fs/promises";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { isBlackFridayVariant, strikethroughPrices, variantPrices } from "./pricing.js";

const fixture = async name => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

// JSON-LD and the refill variant are taken from the live product pages of #3663 (5. 11. 2026)
const pradaJsonLd = await fixture("prada-jsonld.json");
const maybellineJsonLd = await fixture("maybelline-jsonld.json");
const pradaRefill = await fixture("prada-refill-variant.json");
// Prada Paradoxe (4 variants) and Armani Stronger With You Duo Set from the live product pages (7. 11. 2026)
const blackFridayVariants = await fixture("black-friday-variants.json");

const documentWith = jsonLd =>
  parseHTML(`<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`).document;

const price = value => ({ value, currency: "CZK", tax: 21 });

// https://www.notino.cz/prada/paradoxe-sweet-chemistry-parfemovana-voda-pro-zeny/p-16349161/
// page: 4 050 Kč crossed out, 3 442 Kč s kódem bfsale (from 300 Kč), "Poslední nejnižší cena 3 490 Kč"
const prada90ml = {
  webId: "16349161",
  price: price(4050),
  originalPrice: { ...price(5690), type: "HistoricalMax" },
  recentMinPrice: price(3490),
  attributes: {
    ConditionalVoucherDiscount: {
      ...pradaRefill.attributes.ConditionalVoucherDiscount,
      discountConditions: [{ conditionMin: 300, discountedPrice: 3442, productMeetsCondition: true }]
    }
  }
};

// https://www.notino.cz/maybelline/lash-sensational-sky-high-objemova-a-prodluzujici-rasenka/p-16380808/
// page: 335 Kč, nothing crossed out, 268 Kč s kódem notino only "Při nákupu od 2 ks"
const maybelline = {
  webId: "16380808",
  price: price(335),
  originalPrice: { ...price(369), type: "HistoricalMax" },
  recentMinPrice: price(228),
  attributes: {
    ConditionalVoucherDiscount: {
      code: "notino",
      conditionType: "Pieces",
      discountConditions: [{ conditionMin: 2, discountedPrice: 268, productMeetsCondition: false }]
    }
  }
};

test("strikethroughPrices reads the struck-through price of every variant from JSON-LD", t => {
  const prices = strikethroughPrices(documentWith(pradaJsonLd));
  t.deepEqual(
    Object.fromEntries(prices),
    { "16377697": 3590, "16349161": 4050, "16377695": 3150, "16377696": 2050 },
    "4 variants, each with its own price"
  );
  t.is(strikethroughPrices(documentWith(maybellineJsonLd)).size, 0, "nothing is crossed out on the mascara page");
});

test("strikethroughPrices keys a single offer without a variant id by an empty string", t => {
  const offer = { ...pradaJsonLd.offers[1], url: "/prada/paradoxe-sweet-chemistry-parfemovana-voda-pro-zeny/" };
  const prices = strikethroughPrices(documentWith({ ...pradaJsonLd, offers: offer }));
  t.deepEqual(Object.fromEntries(prices), { "": 4050 });
});

test("voucher price is the current price, the regular (crossed-out) price is the original one", t => {
  const strikethrough = strikethroughPrices(documentWith(pradaJsonLd));
  t.deepEqual(variantPrices(prada90ml, strikethrough.get("16349161")), {
    currentPrice: 3442,
    originalPrice: 4050,
    currency: "CZK"
  });
  // real Apollo data: recentMinPrice 2331 used to become the original price, below the current one
  t.deepEqual(variantPrices(pradaRefill, strikethrough.get("16377697")), {
    currentPrice: 3051,
    originalPrice: 3590,
    currency: "CZK"
  });
});

test("voucher for 2 or more pieces is ignored and the historical maximum is not an original price", t => {
  const strikethrough = strikethroughPrices(documentWith(maybellineJsonLd));
  t.deepEqual(variantPrices(maybelline, strikethrough.get("16380808")), {
    currentPrice: 335,
    originalPrice: null,
    currency: "CZK"
  });
});

test("without a voucher the struck-through price from JSON-LD is the original one", t => {
  const variant = { ...maybelline, attributes: {} };
  t.deepEqual(variantPrices(variant, 419), { currentPrice: 335, originalPrice: 419, currency: "CZK" });
});

test("original price that is not above the current one is dropped", t => {
  const variant = { ...maybelline, attributes: {} };
  t.is(variantPrices(variant, 335).originalPrice, null);
  t.is(variantPrices(variant, 300).originalPrice, null);
});

test("price-based voucher counts even when a single item does not reach it (#3607)", t => {
  const variant = {
    price: price(189),
    attributes: {
      ConditionalVoucherDiscount: {
        conditionType: "Price",
        discountConditions: [
          { conditionMin: 1000, discountedPrice: 140, productMeetsCondition: false },
          { conditionMin: 500, discountedPrice: 151, productMeetsCondition: false }
        ]
      }
    }
  };
  t.deepEqual(variantPrices(variant), { currentPrice: 151, originalPrice: 189, currency: "CZK" });
});

test("EUR prices keep cents", t => {
  const variant = {
    price: { value: 12.9, currency: "EUR" },
    attributes: { VoucherDiscount: { discountedPrice: 10.965 } }
  };
  t.deepEqual(variantPrices(variant), { currentPrice: 10.97, originalPrice: 12.9, currency: "EUR" });
});

test("only variants with a voucher tagged blackfriday are Black Friday variants (#3672)", t => {
  t.deepEqual(
    blackFridayVariants.filter(isBlackFridayVariant).map(x => x.webId),
    ["16143146"],
    "1 of the 4 Prada variants has the badge, the Armani set (listed among Black Friday products) has none"
  );
  t.true(isBlackFridayVariant(pradaRefill), "voucher bfsale tagged blackfriday");
});

test("the tag decides, not the voucher code, and an unconditional voucher counts too", t => {
  // the Black Friday listing has a sponsored product with voucher bfsale but no tags and no badge
  t.false(isBlackFridayVariant({ attributes: { ConditionalVoucherDiscount: { code: "bfsale", tags: null } } }));
  t.true(isBlackFridayVariant({ attributes: { VoucherDiscount: { code: "notino", tags: ["blackfriday"] } } }));
  t.false(isBlackFridayVariant({ attributes: {} }));
  t.false(isBlackFridayVariant({}));
});
