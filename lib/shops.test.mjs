import { expect } from "@esm-bundle/chai";
import { shops, shopName, parseItemDetails } from "./shops.mjs";

describe("Shops", () => {

  describe("all_shops_metadata", () => {
    [
      ["https://www.aaaauto.cz/cz/audi-q7/car.html?id=341760592", "341760592"],
      ["https://www.knihydobrovsky.cz/kniha/fantom-z-blackwoodu-361663469", "fantom-z-blackwoodu-361663469"]
    ].forEach(([itemUrl, slug]) => {
      const shop = parseItemDetails(itemUrl);
      it(`${shop.itemUrl} should return ${slug}`, () =>
        expect(shop.itemUrl).to.equal(slug));
    });
  });

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
      ["https://www.tetadrogerie.cz/", "tetadrogerie_cz"],
      ["https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/", "ikea_cz"],
      ["https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/", "ikea_sk"],
      ["https://www.ikea.com/pl/pl/p/malm-rama-lozka-z-2-pojemnikami-bialy-luroey-s19175976/", "ikea_pl"],
      ["https://www.ikea.com/at/de/p/moshult-schaummatratze-fest-weiss-30272339/", "ikea_at"],
      ["https://www.ikea.com/de/de/p/moshult-schaummatratze-fest-weiss-30272339/", "ikea_de"],
      ["https://www.ikea.com/hu/hu/p/beaucarnea-recurvata-noeveny-buzoganyfa-40368794/", "ikea_hu"],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "lidl_cz"],
      ["https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo", "tetadrogerie_cz"],
      ["https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html", "dm"],
      ["https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html", "mojadm_sk"],
      ["https://www.dm.de/dontodent-zahnpasta-antibakteriell-p4058172784675.html", "dm_de"],
      ["https://www.dm.at/alverde-naturkosmetik-pflegedusche-bio-grapefruit-bio-bambus-p4010355583949.html", "dm_at"],
      ["https://www.dm.hu/denkmit-eros-konyhai-zsiroldo-multi-power-4-p4058172755248.html", "dm_hu"]
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
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "100325529"],
      ["https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo", "set-clean-twist-disc-mop-ergo"],
      ["https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html", "9000101290714"],
      ["https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html", "3600521893500"],
      ["https://www.dm.de/dontodent-zahnpasta-antibakteriell-p4058172784675.html", "4058172784675"],
      ["https://www.dm.at/alverde-naturkosmetik-pflegedusche-bio-grapefruit-bio-bambus-p4010355583949.html", "4010355583949"],
      ["https://www.dm.hu/denkmit-eros-konyhai-zsiroldo-multi-power-4-p4058172755248.html", "4058172755248"]
    ].forEach(([itemUrl, slug]) => {
      const url = new URL(itemUrl);
      const shop = shops.get(shopName(itemUrl));
      const itemSlug = shop.parse(url).itemUrl;
      it(`${itemUrl} should return ${slug}`, () =>
        expect(itemSlug).to.equal(slug))
    });
  });
});
