import { expect } from "@esm-bundle/chai";
import { itemSlug, parseItemDetails, shopName, shopOrigin, shops } from "./shops.mjs";

describe("Shops", () => {
  describe("all_shops_metadata", () => {
    [
      ["https://www.aaaauto.cz/cz/audi-q7/car.html?id=341760592", "341760592"],
      ["https://www.knihydobrovsky.cz/kniha/fantom-z-blackwoodu-361663469", "fantom-z-blackwoodu-361663469"]
    ].forEach(([itemUrl, slug]) => {
      const shop = parseItemDetails(itemUrl);
      it(`${shop.itemUrl} should return ${slug}`, () => expect(shop.itemUrl).to.equal(slug));
    });
  });

  describe("shopName", () => {
    [
      ["https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html", "dm_cz"],
      ["https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html", "mojadm_sk"],
      ["https://www.4camping.cz/p/cepice-sensor-merino-wool/#54-58-cm-cerna", "4camping_cz"]
    ].forEach(([itemUrl, expected]) =>
      it(`${itemUrl} should return ${expected}`, () => expect(shopName(itemUrl)).to.equal(expected))
    );
  });

  describe("shopOrigin", () => {
    [
      ["https://www.obi.cz/", "obi.cz"],
      ["https://www.eva.cz/", "eva.cz"],
      ["https://alza.cz/", "alza.cz"],
      ["https://www.alza.cz/", "alza.cz"],
      ["https://m.alza.cz/", "alza.cz"],
      ["https://m.alza.sk/", "alza.sk"],
      ["https://www.alza.sk/", "alza.sk"],
      ["https://www.tetadrogerie.cz/", "tetadrogerie.cz"],
      ["https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/", "ikea.cz"],
      ["https://www.ikea.com/cz/cs/p/ingolf-zidle-moridlo-antik-00217820/", "ikea.cz"],
      ["https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/", "ikea.sk"],
      ["https://www.ikea.com/sk/sk/p/ingabritta-deka-svetloruzova-70374067/", "ikea.sk"],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "lidl.cz"],
      ["https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo", "tetadrogerie.cz"],
      ["https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html", "dm.cz"],
      ["https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html", "mojadm.sk"],
      ["https://www.tchibo.cz/prosivany-kabat-s-kapuci-p402016550.html", "tchibo.cz"],
      [
        "https://www.tchibo.sk/pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935.html",
        "tchibo.sk"
      ],
      ["https://www.hornbach.cz/p/cement-32-5-r-baleni-25-kg/5203035/", "hornbach.cz"],
      ["https://www.hornbach.sk/p/jadrova-omietka-rucna-082-25-kg/10165632/", "hornbach.sk"],
      ["https://www.okay.cz/products/chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna", "okay.cz"],
      ["https://www.megapixel.cz/jjc-stereo-mikrofon-sgm-185ii", "megapixel.cz"],
      ["https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126", "luxor.cz"],
      ["https://shop.iglobus.cz/cz/schubert-erstv-vejce-m-30-ks/8594032850525", "iglobus.cz"],
      ["https://www.4camping.cz/p/cepice-sensor-merino-wool/#54-58-cm-cerna", "4camping.cz"]
    ].forEach(([itemUrl, expected]) =>
      it(`${itemUrl} should return ${expected}`, () => expect(shopOrigin(itemUrl)).to.equal(expected))
    );
  });

  describe("itemSlug", () => {
    [
      [
        "https://www.notino.cz/rexaline/premium-line-killer-x-treme-corrector-omlazujici-gel-na-ocni-okoli/",
        "premium-line-killer-x-treme-corrector-omlazujici-gel-na-ocni-okoli"
      ],
      ["https://www.notino.cz/nutrend/explosin-podpora-sportovniho-vykonu-blueberry/p-16086958/", "16086958"],
      ["https://www.alza.cz/iphone-13-512gb-cervena-levne-d6839524.htm", "6839524"],
      [
        "https://www.alza.cz/sport/victorias-secret-st-11128877-cc-4vmq-cerna",
        "victorias-secret-st-11128877-cc-4vmq-cerna"
      ],
      ["https://www.alza.cz/sport/victorias-secret-st-11156655-cc-38h2-bezova?dq=6920061", "6920061"],
      ["https://www.ikea.com/cz/cs/p/soederhamn-3mistny-sedaci-dil-finnsta-tyrkysova-s89135939/", "89135939"],
      ["https://www.ikea.com/cz/cs/p/ryet-zarovka-led-e27-806-lumenu-kulata-opalove-bila-50447989/", "50447989"],
      ["https://www.ikea.com/sk/sk/p/malm-postel-s-uloz-priestorom-biela-20404806/", "20404806"],
      ["https://www.lidl.cz/p/damsky-fotbalovy-top-uefa/p100325529", "100325529"],
      ["https://www.tetadrogerie.cz/eshop/katalog/set-clean-twist-disc-mop-ergo", "set-clean-twist-disc-mop-ergo"],
      ["https://www.dm.cz/schwarzkopf-got2b-lak-na-vlasy-2sexy-p9000101290714.html", "9000101290714"],
      ["https://www.dm.cz/p/d/2973924/pampers-premium-care-pleny-premium-care-velikost-7", "2973924"],
      ["https://mojadm.sk/l-oreal-paris-maskara-volume-million-lashes-p3600521893500.html", "3600521893500"],
      ["https://www.mojadm.sk/p/d/3051328/balea-telove-maslo-na-holenie-broskyna", "3051328"],
      ["https://www.ikea.com/cz/cs/p/ingolf-zidle-moridlo-antik-00217820/", "00217820"],
      ["https://www.tchibo.cz/prosivany-kabat-s-kapuci-p402016550.html", "prosivany-kabat-s-kapuci-p402016550"],
      [
        "https://www.tchibo.sk/pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935.html",
        "pancuchove-nohavice-3-ks-s-celoplosnou-potlacou-s-motivom-lisky-p402005935"
      ],
      [
        "https://www.okay.cz/products/chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna",
        "chytre-hodinky-samsung-galaxy-watch-4-classic-46mm-stribrna"
      ],
      ["https://www.hornbach.sk/p/jadrova-omietka-rucna-082-25-kg/10165632/", "10165632"],
      ["https://www.hornbach.cz/p/cement-32-5-r-baleni-25-kg/5203035/", "5203035"],
      ["https://www.megapixel.cz/jjc-stereo-mikrofon-sgm-185ii", "jjc-stereo-mikrofon-sgm-185ii"],
      ["https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126", "ma-cesta-za-stestim-zbo000418126"],
      ["https://shop.iglobus.cz/cz/schubert-erstv-vejce-m-30-ks/8594032850525", "8594032850525"],
      ["https://www.rohlik.cz/1357409-mleko-polotucne-1-5", "1357409"],
      ["https://www.rohlik.cz/?productPopup=1357409-mleko-polotucne-1-5", "1357409"],
      [
        "https://www.4camping.cz/p/cepice-sensor-merino-wool/#54-58-cm-cerna",
        "cepice-sensor-merino-wool-54-58-cm-cerna"
      ],
      [
        "https://www.4camping.sk/p/cepice-sensor-merino-wool/#54-58-cm-cerna",
        "cepice-sensor-merino-wool-54-58-cm-cerna"
      ]
    ].forEach(([itemUrl, expected]) => {
      const slug = itemSlug(itemUrl);
      it(`${itemUrl} should return ${expected}`, () => expect(slug).to.equal(expected));
    });
  });
});
