import { readFile } from "node:fs/promises";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import test from "ava";
import { toProduct } from "./main.js";

async function fixture(name) {
  const html = await readFile(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
  return parseHTML(html).document;
}

test("discounted car: cash price is current, pre-discount price is original", async t => {
  const document = await fixture("detail-discounted");
  const product = toProduct(document, "https://www.autoesa.cz/peugeot/3008/mpv/benzin/495455617");
  t.like(product, {
    itemId: "495455617",
    itemName: "Peugeot 3008 1.2 PT Allure",
    currentPrice: 440000,
    originalPrice: 460000,
    currency: "CZK",
    discounted: true,
    year: "2023",
    fuelType: "benzín",
    img: "https://www.autoesa.cz/files/cars/495455617/495455617-1.jpg?1784395107"
  });
});

test("regular car: financing-only price is ignored, no original price", async t => {
  const document = await fixture("detail-regular");
  const product = toProduct(document, "https://www.autoesa.cz/skoda/octavia/liftback/benzin/483461381");
  t.like(product, {
    itemId: "483461381",
    itemName: "Škoda Octavia III 1.4 TSi Active",
    currentPrice: 227000,
    originalPrice: null,
    discounted: false,
    year: "2016",
    km: "58 103km",
    power: "110kW"
  });
});

test("page without the car detail layout throws instead of yielding a priceless item", async t => {
  const { document } = parseHTML("<html><body><div class='initCarDetail car-detail2'></div></body></html>");
  t.throws(() => toProduct(document, "https://www.autoesa.cz/skoda/octavia/liftback/benzin/1"), {
    message: "Car detail layout not found"
  });
});
