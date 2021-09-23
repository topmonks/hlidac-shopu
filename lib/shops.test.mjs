import { expect } from "@esm-bundle/chai";
import { shops, shopName } from "./shops.mjs";

describe("Shops", () => {
  describe("shopName", () => {
    it("should return null for unknown domain", () =>
      expect(shopName("https:///www.example.com")).to.be.null);

    [
      ["https://www.obi.cz/", "obi_cz"],
      ["https://www.eva.cz/", "eva_cz"],
      ["https://rozetka.com.ua/", "rozetka_com_ua"],
      ["https://alza.cz/", "alza"],
      ["https://www.alza.cz/", "alza"],
      ["https://m.alza.cz/", "alza"],
      ["https://m.alza.sk/", "alza_sk"],
      ["https://www.alza.sk/", "alza_sk"],
      ["https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/", "ikea_cz"],
      ["https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/", "ikea_sk"],
      ["https://www.ikea.com/pl/pl/p/malm-rama-lozka-z-2-pojemnikami-bialy-luroey-s19175976/", "ikea_pl"],
      ["https://www.ikea.com/at/de/p/moshult-schaummatratze-fest-weiss-30272339/", "ikea_at"],
      ["https://www.ikea.com/de/de/p/moshult-schaummatratze-fest-weiss-30272339/", "ikea_de"],
      ["https://www.ikea.com/hu/hu/p/beaucarnea-recurvata-noeveny-buzoganyfa-40368794/", "ikea_hu"],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "lidl_cz"]
    ].forEach(([domain, key]) =>
      it(`${domain} should return ${key}`, () =>
        expect(shopName(domain)).to.equal(key))
    );
  });

  describe("shopSlug", () => {
    [
      ["https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/", "89135939"],
      ["https://www.ikea.com/cz/cs/p/ryet-zarovka-led-e27-806-lumenu-kulata-opalove-bila-50447989/", "50447989"],
      ["https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/", "20404806"],
      ["https://www.ikea.com/pl/pl/p/malm-rama-lozka-z-2-pojemnikami-bialy-luroey-s19175976/", "19175976"],
      ["https://www.ikea.com/pl/pl/p/utrusta-blat-wysuwany-00510577/", "00510577"],
      ["https://www.ikea.com/at/de/p/moshult-schaummatratze-fest-weiss-30272339/", "30272339"],
      ["https://www.ikea.com/de/de/p/moshult-schaummatratze-fest-weiss-30272339/", "30272339"],
      ["https://www.ikea.com/hu/hu/p/beaucarnea-recurvata-noeveny-buzoganyfa-40368794/", "40368794"],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "100325529"]
    ].forEach(([itemUrl, slug]) => {
      const url = new URL(itemUrl);
      const shop = shops.get(shopName(itemUrl));
      const itemSlug = shop.parse(url).itemUrl;
      it(`${itemUrl} should return ${slug}`, () =>
        expect(itemSlug).to.equal(slug))
    });
  });
});
