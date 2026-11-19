import test from "ava";
import { listingProducts, listingResult, productCategory, tileProducts } from "./listing.js";

const url = "https://www.obi.cz/formatovaci-kapovaci-a-pokosove-pily/c/1337";
const nbsp = "\u00a0";

// Trimmed store of a category listing (13. 11. 2026), escaped as the page embeds it.
const html = String.raw`<script>window.__INITIAL_STATE__='{"pinia":{"suche":{"suchergebnis":{
"gesamtanzahlErgebnisse":117,"seitenAnzahl":2,
"breadcrumbContent":{"breadcrumbs":[{"name":"Technika"},{"name":"Pily"}]},
"ergebnisListe":[
{"artikelNummer":"6188635","artikelName":"Einhell Kapovací pila TC-SM 2131\u002F2 \\"Dual\\"","detailseitenUrl":"\u002Fpily\u002Feinhell\u002Fp\u002F6188635",
"bilder":[{"urlSchema":"https:\u002F\u002Fbilder.obi.cz\u002Fabc\u002F[PROFIL]\u002Fimage.jpeg"}],"jsonLdPreis":"2999.00",
"preise":{"preisPrimary":{"formatierterPreis":"2${nbsp}999,-${nbsp}Kč*","waehrungsIsoCode":"CZK"},"vergleichsPreisPrimary":{"formatierterPreis":"3${nbsp}999,-${nbsp}Kč{hochzahl}"}}},
{"artikelNummer":"7077332","artikelName":"Pila O\'Brien 1\u002F2\\" \u003Cmini\u003E","detailseitenUrl":"\u002Fpily\u002Fpila\u002Fp\u002F7077332",
"bilder":[],"jsonLdPreis":"13.27","preise":{"preisPrimary":{"formatierterPreis":"13,27${nbsp}Kč*","waehrungsIsoCode":"CZK"}}},
{"artikelNummer":"2800993","artikelName":"Podlahová podložka","detailseitenUrl":"\u002Fpodlozka\u002Fp\u002F2800993",
"bilder":[],"jsonLdPreis":"399.00","preise":{"preisPrimary":{"formatierterPreis":"15,96${nbsp}Kč${nbsp}/${nbsp}m","waehrungsIsoCode":"CZK"},"vergleichsPreisPrimary":{"formatierterPreis":"20,-${nbsp}Kč${nbsp}/${nbsp}m"}}},
{"artikelNummer":"1111111","isSponsoredProductAd":true}
]}}}}';
</script>`;

test("listing state is read from the escaped JS string (#3682)", t => {
  const result = listingResult(html);
  t.is(result.gesamtanzahlErgebnisse, 117);
  t.is(result.seitenAnzahl, 2);
});

test("page without the store has no listing", t => {
  t.is(listingResult("<html><title>OBI</title></html>"), undefined);
});

test("products of a listing, without sponsored tiles", t => {
  t.deepEqual(listingProducts({ result: listingResult(html), url }), [
    {
      itemId: "6188635",
      itemUrl: "https://www.obi.cz/pily/einhell/p/6188635",
      itemName: 'Einhell Kapovací pila TC-SM 2131/2 "Dual"',
      img: "https://bilder.obi.cz/abc/pr07F/image.jpeg",
      currency: "CZK",
      currentPrice: 2999,
      originalPrice: 3999,
      discounted: true,
      inStock: true,
      category: "Technika/Pily"
    },
    {
      itemId: "7077332",
      itemUrl: "https://www.obi.cz/pily/pila/p/7077332",
      itemName: `Pila O'Brien 1/2" <mini>`,
      img: null,
      currency: "CZK",
      currentPrice: 13.27,
      originalPrice: null,
      discounted: false,
      inStock: true,
      category: "Technika/Pily"
    },
    {
      itemId: "2800993",
      itemUrl: "https://www.obi.cz/podlozka/p/2800993",
      itemName: "Podlahová podložka",
      img: null,
      currency: "CZK",
      currentPrice: 15.96,
      originalPrice: 20,
      discounted: true,
      inStock: true,
      category: "Technika/Pily"
    }
  ]);
});

// Trimmed tiles of the obi.cz Black Friday promotion (16. 11. 2026).
const tiles = [
  {
    id: "1072826",
    name: "Biohort Zahradní box Freizeitbox 130 tmavě šedý, 134 x 62 x 71 cm",
    url: { href: "https://www.obi.cz/univerzalni-boxy/biohort-zahradni-box/p/1072826" },
    price: {
      currency: { code: "CZK" },
      crossedOut: { salesUnitPrice: 9999, type: "STANDARD_STRIKE_PRICE" },
      salesUnit: { value: 7999 }
    },
    image: { content: { id: "4271f8d8", provider: { content: { baseUrl: "https://bilder.obi.cz" } } } }
  },
  {
    id: "6536684",
    name: "Decoflooring Vinylová podlaha SPC+IXPE, dub Lyon",
    url: { href: "/p/6536684" },
    price: {
      base: { prominent: true, unit: "m²", value: 339 },
      currency: { code: "CZK" },
      salesUnit: { value: 757.66 }
    },
    image: { content: { id: "d03c8d02", provider: { content: { baseUrl: "https://bilder.obi.cz" } } } }
  }
];

test("Black Friday tiles carry the listing's pack and strike prices (#3694)", t => {
  const url = "https://www.obi.cz/api/disc/product-tiles/by-promotion/cz/cs/000";
  t.deepEqual(tileProducts({ tiles, url }), [
    {
      itemId: "1072826",
      itemUrl: "https://www.obi.cz/univerzalni-boxy/biohort-zahradni-box/p/1072826",
      itemName: "Biohort Zahradní box Freizeitbox 130 tmavě šedý, 134 x 62 x 71 cm",
      img: "https://bilder.obi.cz/4271f8d8/pr07F/image.jpeg",
      currency: "CZK",
      currentPrice: 7999,
      originalPrice: 9999,
      discounted: true,
      inStock: true,
      category: null
    },
    {
      itemId: "6536684",
      itemUrl: "https://www.obi.cz/p/6536684",
      itemName: "Decoflooring Vinylová podlaha SPC+IXPE, dub Lyon",
      img: "https://bilder.obi.cz/d03c8d02/pr07F/image.jpeg",
      currency: "CZK",
      currentPrice: 757.66,
      originalPrice: null,
      discounted: false,
      inStock: true,
      category: null
    }
  ]);
});

// Trimmed breadcrumb of a product page (16. 11. 2026).
const productPage = `<ul class="breadcrumb">
<li><a class="normal home" href="https://www.obi.cz" wt_name="breadcrumb.home"><span>Úvodní stránka</span></a></li>
<li><a class="normal" href="https://www.obi.cz/zahrada-a-volny-cas/c/860" wt_name="breadcrumb.level1"><span data-ui-name="breadcrumb.level1">Zahrada a volný čas</span></a>
<a class="breadcrumb__dropdown__link" href="https://www.obi.cz/zahrada-a-volny-cas/c/860" wt_name="breadcrumb.level1">Zahrada a volný čas</a></li>
<li><a class="normal" href="https://www.obi.cz/zahrada-a-volny-cas/poradek-v-zahrade/c/3628" wt_name="breadcrumb.level2"><span data-ui-name="breadcrumb.level2">Pořádek v zahradě</span></a></li>
<li><a class="normal active" href="https://www.obi.cz/poradek-v-zahrade/univerzalni-boxy/c/3637" wt_name="breadcrumb.level3"><span data-ui-name="breadcrumb.level3">Univerzální boxy</span></a></li>
</ul>`;

test("Black Friday category is the product page breadcrumb (#3694)", t => {
  t.is(productCategory(productPage), "Zahrada a volný čas/Pořádek v zahradě/Univerzální boxy");
  t.is(productCategory("<html><title>OBI</title></html>"), "");
});
