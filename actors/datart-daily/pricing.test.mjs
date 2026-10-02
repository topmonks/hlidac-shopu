import { readFile } from "node:fs/promises";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { Datart } from "../../extension/shops/datart.mjs";
import { createCouponPricer, extractItems } from "./main.js";

const detailHtml = await readFile(new URL("./fixtures/coupon-product.html", import.meta.url), "utf8");
const listingHtml = await readFile(new URL("./fixtures/coupon-listing.html", import.meta.url), "utf8");

function detailDocument(t) {
  const previous = globalThis.document;
  const { document } = parseHTML(detailHtml);
  globalThis.document = document;
  t.teardown(() => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  });
  return document;
}

// Only the remote campaign API is replaced. Listing extraction, campaign parsing,
// voucher arithmetic and the final product price selection all run unchanged.
function couponApi(t, { format = "categoryAutoDiscount", value = 4949 } = {}) {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    t.is(url, "https://ctd-api.datart.cz/campaigns/banners/show");
    const {
      banner_ids: [id],
      params
    } = JSON.parse(options.body);
    let js;
    if (id === "executor") {
      t.deepEqual(params.productIds, ["SAMMRE65R85H"]);
      const tree = [
        {
          maxWebleyers: 1,
          campaigns: [
            {
              format,
              campaign_name: "Fixture coupon",
              weblayer_id: "discount",
              hasFilters: "True",
              campaignProducts: [
                { match: "SAMMRE65R85H", price: 32990, vouchers: [{ voucher_group: "other", voucher_value: value }] }
              ]
            }
          ]
        }
      ];
      js = `JSON.parse('${JSON.stringify(tree)}')`;
    } else {
      t.is(id, "discount");
      js =
        format === "categoryAutoDiscount"
          ? 'this.options = { nameSpace: "CategoryAutoDiscount" };'
          : 'this.options = { nameSpace: "CategoryDiscount", discountPrice: "15", discountType: "Procentuální", targetGroup: "NO-VIP" };';
    }
    return new Response(JSON.stringify({ success: true, data: [js] }));
  };
  t.teardown(() => {
    globalThis.fetch = previous;
  });
  return createCouponPricer({ companyId: "fixture", executorId: "executor", stats: { inc() {}, add() {} } });
}

test.serial("extension: coupon originalPrice is the pre-coupon price, not the 30-day minimum (#3606)", async t => {
  detailDocument(t);
  const product = await new Datart().scrape();
  t.is(product.itemId, "2001189");
  t.is(Number(product.currentPrice), 28041);
  t.is(Number(product.originalPrice), 32990);
});

test.serial("actor: auto-voucher preserves the pre-coupon originalPrice (#3606)", async t => {
  const priceProducts = couponApi(t);
  const products = extractItems(parseHTML(listingHtml).document, "https://www.datart.cz", "CZ");
  await priceProducts(products);
  t.is(products.length, 1);
  t.is(products[0].itemId, "2001189");
  t.is(products[0].currentPrice, 28041);
  t.is(products[0].originalPrice, 32990);
  t.true(products[0].discounted);
});

test.serial("extension: delayed Exponea coupon uses the displayed originalPrice too", async t => {
  const document = detailDocument(t);
  document.querySelector(".discount-price-box").remove();
  const timer = setTimeout(() => {
    const banner = document.createElement("div");
    banner.className = "exponea-product-discount";
    banner.innerHTML = '<span id="unique-price-after-sale">28 041 Kč</span>';
    document.querySelector(".product-detail").append(banner);
  }, 50);
  t.teardown(() => clearTimeout(timer));
  const product = await new Datart().scrape();
  t.is(Number(product.currentPrice), 28041);
  t.is(Number(product.originalPrice), 32990);
});

test.serial("actor: percentage campaign uses the pre-coupon originalPrice too", async t => {
  const priceProducts = couponApi(t, { format: "categoryDiscount" });
  const products = extractItems(parseHTML(listingHtml).document, "https://www.datart.cz", "CZ");
  await priceProducts(products);
  t.is(products[0].currentPrice, 28041);
  t.is(products[0].originalPrice, 32990);
  t.true(products[0].discounted);
});

for (const reference of [null, 39990]) {
  test.serial(`coupon originalPrice ignores a missing or higher 30-day reference (${reference})`, async t => {
    const document = detailDocument(t);
    const listing = parseHTML(listingHtml).document;
    if (reference === null) {
      document.querySelector(".product-price-before-30").remove();
      listing.querySelector(".cut-price").remove();
    } else {
      document.querySelector(".product-price-before-30-price").textContent = `${reference} Kč`;
      listing.querySelector(".cut-price--lessOrEqual").textContent = `${reference} Kč`;
    }
    const extension = await new Datart().scrape();
    const priceProducts = couponApi(t);
    const products = extractItems(listing, "https://www.datart.cz", "CZ");
    await priceProducts(products);
    t.is(Number(extension.originalPrice), 32990);
    t.is(products[0].originalPrice, 32990);
    t.is(Number(extension.currentPrice), 28041);
    t.is(products[0].currentPrice, 28041);
  });
}

for (const scenario of ["ordinary discount", "undiscounted", "ineffective coupon"]) {
  test.serial(`preserves non-coupon prices: ${scenario}`, async t => {
    const document = detailDocument(t);
    const listing = parseHTML(listingHtml).document;
    if (scenario === "ineffective coupon") {
      document.querySelector(".price-finally").textContent = "32 990 Kč";
    } else {
      document.querySelector(".discount-price-box").remove();
    }
    if (scenario === "ordinary discount") {
      document.querySelector(".product-price-before-30").outerHTML =
        '<div class="product-price-before"><span class="cut-price"><span class="sr-only">Nejnižší cena za posledních 30 dní.</span><ufo-tooltip>30 dní</ufo-tooltip>39 990 Kč</span></div>';
      listing.querySelector(".cut-price--lessOrEqual").textContent = "39 990 Kč";
    } else if (scenario === "undiscounted") {
      document.querySelector(".product-price-before-30").remove();
      listing.querySelector(".cut-price").remove();
    }
    const extension = await new Datart().scrape();
    const priceProducts = couponApi(t, { value: 0 });
    const products = extractItems(listing, "https://www.datart.cz", "CZ");
    await priceProducts(products);
    t.is(Number(extension.currentPrice), 32990);
    t.is(products[0].currentPrice, 32990);
    t.is(
      extension.originalPrice == null ? null : Number(extension.originalPrice),
      scenario === "ordinary discount" ? 39990 : scenario === "undiscounted" ? null : 29213
    );
    t.is(
      products[0].originalPrice,
      scenario === "ordinary discount" ? 39990 : scenario === "undiscounted" ? 32990 : 29213
    );
    t.is(products[0].discounted, scenario === "ordinary discount");
  });
}
