import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";

const STATE_MARKER = "window.__INITIAL_STATE__='";

/** Image size the listing tiles show (300 px wide). */
const IMAGE_PROFILE = "pr07F";

/**
 * Category listings are rendered from a Pinia store that the page embeds as
 * JSON text inside a single-quoted JS string, with `\` and `'` escaped.
 * Undoing those two gives the JSON back; the `\uXXXX` the page writes for `/`,
 * `<` and `>` sits inside JSON strings, where `JSON.parse` decodes it.
 *
 * @param {string} html
 * @returns {object | undefined} search result of the listing
 */
export function listingResult(html) {
  const start = html.indexOf(STATE_MARKER);
  if (start === -1) return;
  const end = html.lastIndexOf("'", html.indexOf("</script>", start));
  const json = html.slice(start + STATE_MARKER.length, end).replace(/\\(['\\])/g, "$1");
  return JSON.parse(json).pinia?.suche?.suchergebnis;
}

/**
 * Size and colour variants are listed as separate products, each in the
 * category it belongs to. Sponsored tiles advertise products of other
 * categories and are skipped, so a product keeps the category that lists it.
 *
 * @param {{ result: object, url: string }} options
 */
export function listingProducts({ result, url }) {
  const category = result.breadcrumbContent.breadcrumbs.map(({ name }) => name).join("/");
  return result.ergebnisListe
    .filter(item => !item.isSponsoredProductAd)
    .map(item => {
      const { preisPrimary, vergleichsPreisPrimary } = item.preise;
      const currentPrice = cleanPrice(item.jsonLdPreis);
      const originalPrice = cleanPrice(vergleichsPreisPrimary?.formatierterPreis);
      return {
        itemId: item.artikelNummer,
        itemUrl: new URL(item.detailseitenUrl, url).href,
        itemName: item.artikelName,
        img: item.bilder[0]?.urlSchema.replace("[PROFIL]", IMAGE_PROFILE) ?? null,
        currency: preisPrimary.waehrungsIsoCode,
        currentPrice,
        originalPrice,
        discounted: Boolean(originalPrice && originalPrice > currentPrice),
        // The listing shows only whether a product can be ordered online, not stock.
        inStock: true,
        category
      };
    })
    .filter(product => product.currentPrice);
}
