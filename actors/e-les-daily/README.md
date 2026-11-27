# E-les daily actor

Enumerates candidates from https://www.e-les.cz/sitemap.xml, including custom
slugs, rather than requiring the legacy -d<ID>.htm suffix. On 2026-11-16 the
sitemap contained 22,449 URLs: 4,475 legacy product URLs and many custom paths.
The earlier discovery filter returned 20,890 candidates (4,475 legacy, 16,415
other paths), before restricting history keys to single-segment paths. The
current filter also rejects nested paths, alongside obvious legacy categories,
articles, blog routes, policy pages, assets and query URLs. The revised candidate
count and full catalogue coverage have not been measured.
Custom categories and articles cannot always be identified from their URL;
only pages with Product JSON-LD are saved. Others increment nonProductPages.

Product JSON-LD supplies the VAT-inclusive Offer price, availability, image
and category. The displayed pre-discount price is stored only when greater
than the selling price. Recognized unpriced Products increment unpricedItems;
malformed priced products count as failed requests.

The reference price uses the sibling of the label titled "Nejnižší prodejní
cena za posledních 30 dní". Widget placement uses data-selector="dialTooltipBoundary".
Hashed .c754/.c757 classes remain only as fallbacks for older markup; a site
redeploy may break those fallbacks. Product detection, name and selling price
use Product JSON-LD without a hashed heading selector.

## Identity and history keys

itemId is the numeric eshopDataLayerSnapshot.product.id for both URL styles.
The extension reads the same field. Legacy pages without the snapshot can
fall back to the identical numeric -d<ID>.htm suffix. Missing or malformed
identity on a custom Product fails extraction; SKU/MPN is never substituted.

The URL-only registry cannot recover an internal ID from a custom slug. It
follows the existing Benu pattern: parse() returns itemId: null and the path
as a single path segment in itemUrl. Nested paths are rejected. Legacy parse() returns the
numeric suffix in both fields. The actor computes slug with this same rule
locally because its Docker image installs the published actors-common/lib,
which may not yet contain the new registry entry. API history lookup uses
itemId ?? itemUrl, independently of the extension's internal itemId.

For example, custom product 22521 has slug stihl-topny-prvek-11414345130;
legacy product 1595 has slug 1595. Internal itemId remains stable if a product
changes URL style, but path-based history keys do not merge aliases or survive
custom-slug renames automatically. Redirected pages use their loaded URL.
This is the registry's existing URL fallback contract, not a claim of alias
reconciliation. Full-catalogue completeness and alias coverage need a bounded
reconciliation or an authorized full run before production scheduling.

## Requests and local verification

Runtime robots.txt checking is enabled. maxConcurrency is 1, with a 2.1-second
pause before every navigation, including retries (Crawl-delay: 2). Rate is
also capped at 25 requests/minute. Detail crawling avoids listing pagination
and category overlap, but costs more requests than a reconciled listing/feed
collector. Results are uploaded before checking crawl quality. More than 1% failed
requests or fewer than 10 saved products fail a FULL run; TEST requires one product.

Run `yarn workspace @hlidac-shopu/e-les-daily start` with local Apify input:

```json
{"development":true,"type":"TEST","maxRequestRetries":0}
```

TEST defaults to two custom products and one legacy product; optional urls
accepts at most 20 URLs. TEST never uploads. FULL reads the sitemap and uploads
to e-les_cz only outside development. Use fresh local Apify storage per sample.

The 2026-11-16 sample saved three records with no failures:

| URL path | itemId | slug | Price (CZK) | Reference (CZK) |
| --- | --- | --- | ---: | ---: |
| /stihl-topny-prvek-11414345130 | 22521 | stihl-topny-prvek-11414345130 | 500 | null |
| /stihl-topny-prvek-11404306004 | 22518 | stihl-topny-prvek-11404306004 | 685.01 | null |
| /Vodici-lista-Stihl-30cm-3-8-1-1-44cl-30050003905-d1595.htm | 1595 | 1595 | 596 | 745 |

All three were in stock. Fixtures are saved HTML excerpts captured 2026-11-16.
custom-slug.html comes from https://www.e-les.cz/stihl-topny-prvek-11414345130
and preserves the Product JSON-LD, identity snapshot, title and price block.
Unrelated scripts, forms and customer reviews are omitted. Tests cover actor,
registry and extension agreement, URL-style changes and invalid identities.
No full crawl, Apify deployment, production upload or live history ingestion
was verified.
