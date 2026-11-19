import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
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
 * The price is the one the tile shows as its largest number (`preisPrimary`):
 * per m or m² for products sold by length or area. `jsonLdPreis` is the price
 * of the whole sales unit (a roll, a pack) and does not match it.
 *
 * @param {{ result: object, url: string }} options
 */
export function listingProducts({ result, url }) {
  const category = result.breadcrumbContent.breadcrumbs.map(({ name }) => name).join("/");
  return result.ergebnisListe
    .filter(item => !item.isSponsoredProductAd)
    .map(item => {
      const { preisPrimary, vergleichsPreisPrimary } = item.preise;
      const currentPrice = cleanPrice(preisPrimary.formatierterPreis);
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

/**
 * The Black Friday page renders its products from the shop's product-tile
 * API, not from the listing store. Its prices are the ones category listings
 * show: `salesUnit` is the listing's `jsonLdPreis` (per pack, not the per-m²
 * `base` price) and `crossedOut` its strike price. The API has no
 * breadcrumbs, so the category comes from the product page
 * (`productCategory`). Some products have only a relative `/p/<id>` link.
 *
 * @param {{ tiles: object[], url: string }} options `data` of a product-tile API response and its URL
 */
export function tileProducts({ tiles, url }) {
  return tiles.map(({ id, name, url: link, price, image }) => {
    const currentPrice = price.salesUnit.value;
    const originalPrice = price.crossedOut?.salesUnitPrice ?? null;
    return {
      itemId: id,
      itemUrl: new URL(link.href, url).href,
      itemName: name,
      img: `${image.content.provider.content.baseUrl}/${image.content.id}/${IMAGE_PROFILE}/image.jpeg`,
      currency: price.currency.code,
      currentPrice,
      originalPrice,
      discounted: Boolean(originalPrice && originalPrice > currentPrice),
      // Like the listings, the tiles tell only whether a product can be ordered online.
      inStock: true,
      category: null
    };
  });
}

/**
 * The product page breadcrumb names the same categories as the listing
 * breadcrumb. Each level has one `span`; the dropdown repeats the names in
 * bare links.
 *
 * @param {string} html product page
 * @returns {string} category path, empty when the page has no breadcrumb
 */
export function productCategory(html) {
  const { document } = parseHTML(html);
  return document
    .querySelectorAll('span[data-ui-name^="breadcrumb.level"]')
    .map(span => span.textContent.trim())
    .join("/");
}
