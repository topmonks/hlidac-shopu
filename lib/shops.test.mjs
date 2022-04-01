import { expect } from "@esm-bundle/chai";
import {
  shops,
  shopName,
  parseItemDetails,
  itemSlug,
  shopOrigin
} from "./shops.mjs";

describe("Shops", () => {
  describe("all_shops_metadata", () => {
    [
      ["https://www.aaaauto.cz/cz/audi-q7/car.html?id=341760592", "341760592"],
      [
        "https://www.knihydobrovsky.cz/kniha/fantom-z-blackwoodu-361663469",
        "fantom-z-blackwoodu-361663469"
      ]
    ].forEach(([itemUrl, slug]) => {
      const shop = parseItemDetails(itemUrl);
      it(`${shop.itemUrl} should return ${slug}`, () =>
        expect(shop.itemUrl).to.equal(slug));
    });
  });

  describe("shopOrigin", () => {
    [
      ["https://www.obi.cz/", "obi.cz"],
      ["https://www.eva.cz/", "eva.cz"],
      ["https://rozetka.com.ua/", "rozetka.com.ua"],
      ["https://alza.cz/", "alza.cz"],
      ["https://www.alza.cz/", "alza.cz"],
      ["https://m.alza.cz/", "alza.cz"],
      ["https://m.alza.sk/", "alza.sk"],
      ["https://www.alza.sk/", "alza.sk"],
      ["https://www.tetadrogerie.cz/", "tetadrogerie.cz"],
      [
        "https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/",
        "ikea.cz"
      ],
      [
        "https://www.ikea.com/cz/cs/p/ingolf-zidle-moridlo-antik-00217820/",
        "ikea.cz"
      ],
      [
        "https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/",
        "ikea.sk"
      ],
      [
        "https://www.ikea.com/sk/sk/p/ingabritta-deka-svetloruzova-70374067/",
        "ikea.sk"
      ],
      [
        "https://www.ikea.com/pl/pl/p/malm-rama-lozka-z-2-pojemnikami-bialy-luroey-s19175976/",
        "ikea.pl"
      ],
      [
        "https://www.ikea.com/at/de/p/moshult-schaummatratze-fest-weiss-30272339/",
        "ikea.at"
      ],
      [
        "https://www.ikea.com/de/de/p/moshult-schaummatratze-fest-weiss-30272339/",
        "ikea.de"
      ],
      [
        "https://www.ikea.com/hu/hu/p/beaucarnea-recurvata-noeveny-buzoganyfa-40368794/",
        "ikea.hu"
      ],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "lidl.cz"],
      [
        "https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo",
        "tetadrogerie.cz"
      ],
      [
        "https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html",
        "dm.cz"
      ],
      [
        "https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html",
        "mojadm.sk"
      ],
      [
        "https://www.dm.de/dontodent-zahnpasta-antibakteriell-p4058172784675.html",
        "dm.de"
      ],
      [
        "https://www.dm.at/alverde-naturkosmetik-pflegedusche-bio-grapefruit-bio-bambus-p4010355583949.html",
        "dm.at"
      ],
      [
        "https://www.dm.hu/denkmit-eros-konyhai-zsiroldo-multi-power-4-p4058172755248.html",
        "dm.hu"
      ],
      [
        "https://www.tchibo.cz/prosivany-kabat-s-kapuci-p402016550.html",
        "tchibo.cz"
      ],
      [
        "https://www.tchibo.sk/pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935.html",
        "tchibo.sk"
      ],
      [
        "https://www.hornbach.cz/shop/Kombinovane-kladivo-MAKITA-HR-2630X7/6263427/artikl.html",
        "hornbach.cz"
      ],
      [
        "https://www.hornbach.sk/shop/Zapalovac-domaci-s-otocnou-koncovkou-rozne-farby/5608674/artikel.html",
        "hornbach.sk"
      ],
      [
        "https://www.dek.cz/produkty/detail/1710101150-tkanina-g120-oko-40x40-145g-m2-50m2-bal-vertex",
        "dek.cz"
      ],
      [
        "https://dek.sk/produkty/detail/1650315700-drot-viazaci-1-8-mmx50m-pozink-142218",
        "dek.sk"
      ],
      [
        "https://www.okay.cz/products/chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna",
        "okay.cz"
      ],
      [
        "https://www.megapixel.cz/jjc-stereo-mikrofon-sgm-185ii",
        "megapixel.cz"
      ],
      [
        "https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126",
        "luxor.cz"
      ],
      [
        "https://www.conrad.cz/p/smd-led-zarovka-eufab-ba9s-13527-15-w-ba9s-bila-2-ks-841212",
        "conrad.cz"
      ],
      [
        "https://shop.iglobus.cz/cz/schubert-erstv-vejce-m-30-ks/8594032850525",
        "iglobus.cz"
      ]
    ].forEach(([itemUrl, expected]) =>
      it(`${itemUrl} should return ${expected}`, () =>
        expect(shopOrigin(itemUrl)).to.equal(expected))
    );
  });

  describe("itemSlug", () => {
    [
      [
        "https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/",
        "89135939"
      ],
      [
        "https://www.ikea.com/cz/cs/p/ryet-zarovka-led-e27-806-lumenu-kulata-opalove-bila-50447989/",
        "50447989"
      ],
      [
        "https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/",
        "20404806"
      ],
      [
        "https://www.ikea.com/pl/pl/p/malm-rama-lozka-z-2-pojemnikami-bialy-luroey-s19175976/",
        "19175976"
      ],
      [
        "https://www.ikea.com/pl/pl/p/utrusta-blat-wysuwany-00510577/",
        "00510577"
      ],
      [
        "https://www.ikea.com/at/de/p/moshult-schaummatratze-fest-weiss-30272339/",
        "30272339"
      ],
      [
        "https://www.ikea.com/de/de/p/moshult-schaummatratze-fest-weiss-30272339/",
        "30272339"
      ],
      [
        "https://www.ikea.com/hu/hu/p/beaucarnea-recurvata-noeveny-buzoganyfa-40368794/",
        "40368794"
      ],
      [
        "https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529",
        "100325529"
      ],
      [
        "https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo",
        "set-clean-twist-disc-mop-ergo"
      ],
      [
        "https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html",
        "9000101290714"
      ],
      [
        "https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html",
        "3600521893500"
      ],
      [
        "https://www.dm.de/dontodent-zahnpasta-antibakteriell-p4058172784675.html",
        "4058172784675"
      ],
      [
        "https://www.dm.at/alverde-naturkosmetik-pflegedusche-bio-grapefruit-bio-bambus-p4010355583949.html",
        "4010355583949"
      ],
      [
        "https://www.dm.hu/denkmit-eros-konyhai-zsiroldo-multi-power-4-p4058172755248.html",
        "4058172755248"
      ],
      [
        "https://www.ikea.com/cz/cs/p/ingolf-zidle-moridlo-antik-00217820/",
        "00217820"
      ],
      [
        "https://www.tchibo.cz/prosivany-kabat-s-kapuci-p402016550.html",
        "prosivany-kabat-s-kapuci-p402016550"
      ],
      [
        "https://www.tchibo.sk/pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935.html",
        "pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935"
      ],
      [
        "https://www.dek.cz/produkty/detail/1710101150-tkanina-g120-oko-40x40-145g-m2-50m2-bal-vertex",
        "1710101150"
      ],
      [
        "https://dek.sk/produkty/detail/1650315700-drot-viazaci-1-8-mmx50m-pozink-142218",
        "1650315700"
      ],
      [
        "https://www.okay.cz/products/chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna",
        "chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna"
      ],
      [
        "https://www.hornbach.cz/shop/1-3-hadicove-sroubeni-GEKA-lita-mosaz-1-zavit-pro-pripojeni-1-hadice/1626513/artikl.html",
        "1626513"
      ],
      [
        "https://www.megapixel.cz/jjc-stereo-mikrofon-sgm-185ii",
        "jjc-stereo-mikrofon-sgm-185ii"
      ],
      [
        "https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126",
        "ma-cesta-za-stestim-zbo000418126"
      ],
      [
        "https://www.conrad.cz/p/smd-led-zarovka-eufab-ba9s-13527-15-w-ba9s-bila-2-ks-841212",
        "841212"
      ],
      [
        "https://shop.iglobus.cz/cz/schubert-erstv-vejce-m-30-ks/8594032850525",
        "8594032850525"
      ]
    ].forEach(([itemUrl, expected]) => {
      const slug = itemSlug(itemUrl);
      it(`${itemUrl} should return ${expected}`, () =>
        expect(slug).to.equal(expected));
    });
  });
});
