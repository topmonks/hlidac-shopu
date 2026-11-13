import test from "ava";
import { listingProducts, listingResult } from "./listing.js";

const url = "https://www.obi.cz/formatovaci-kapovaci-a-pokosove-pily/c/1337";
const nbsp = "\u00a0";

// Trimmed store of a category listing (13. 11. 2026), escaped as the page embeds it.
const html = String.raw`<script>window.__INITIAL_STATE__='{"pinia":{"suche":{"suchergebnis":{
"gesamtanzahlErgebnisse":117,"seitenAnzahl":2,
"breadcrumbContent":{"breadcrumbs":[{"name":"Technika"},{"name":"Pily"}]},
"ergebnisListe":[
{"artikelNummer":"6188635","artikelName":"Einhell Kapovací pila TC-SM 2131\u002F2 \\"Dual\\"","detailseitenUrl":"\u002Fpily\u002Feinhell\u002Fp\u002F6188635",
"bilder":[{"urlSchema":"https:\u002F\u002Fbilder.obi.cz\u002Fabc\u002F[PROFIL]\u002Fimage.jpeg"}],"jsonLdPreis":"2999.00",
"preise":{"preisPrimary":{"waehrungsIsoCode":"CZK"},"vergleichsPreisPrimary":{"formatierterPreis":"3${nbsp}999,-${nbsp}Kč{hochzahl}"}}},
{"artikelNummer":"7077332","artikelName":"Pila O\'Brien 1\u002F2\\" \u003Cmini\u003E","detailseitenUrl":"\u002Fpily\u002Fpila\u002Fp\u002F7077332",
"bilder":[],"jsonLdPreis":"13.27","preise":{"preisPrimary":{"waehrungsIsoCode":"CZK"}}},
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
    }
  ]);
});
