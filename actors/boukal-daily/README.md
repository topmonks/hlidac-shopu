# Boukal daily actor

Follows only sitemap-products-N.xml entries from
https://www.boukal.cz/sitemap-index.xml. Both product sitemaps together listed
**85,758** URLs on 2026-11-16. Category and image sitemaps are excluded.

Reads VAT-inclusive current_price microdata within the main product_detail,
the internal numeric SKU, canonical path, Open Graph image and breadcrumbs.
History uses the product path segment: both legacy -produkt and arbitrary
code suffixes exist. Older nested paths ending in _p<ID> are also supported. Category URLs cannot be distinguished from product URLs by shape alone;
the extension requires a product detail layout before rendering anything.

Regular and Black Friday samples expose no original price. data-contentold
contains the unrounded current price, so it must never be used as an original
price. originalPrice stays null and discounted false. Stock comes from the
main Offer, never from recommended products. Missing images remain null.

Robots.txt is checked at runtime. One request runs at a time, delayed by 2.1
seconds. Results are uploaded before checking crawl quality. More than 1% failed
requests or fewer than 10 saved products fail a FULL run; TEST requires one product.
FULL uploads to boukal_cz outside development. TEST never uploads.

Run `yarn workspace @hlidac-shopu/boukal-daily start` with Apify input:

```json
{"development":true,"type":"TEST","maxRequestRetries":0}
```

The default sample reads three products; optional `urls` accepts up to 20
product URLs. Use fresh local storage for independent samples.

Fixtures are real HTML excerpts captured 2026-11-16, with canonical source URLs.
They include a regular product, a campaign product without a reference price
and an unavailable product without an image. Forms, scripts and customer
content are excluded. No product with a displayed pre-discount price was found
in the sampled regular or campaign pages.

Recognized product pages without a selling price are counted as unpricedItems
and skipped; malformed priced products count as failed requests.

Robots.txt was checked on 2026-11-16: the wildcard user-agent has no
Crawl-delay directive. The conservative 2.1-second pause and concurrency 1
also apply to retries; runtime robots.txt path checking remains enabled.
Actor slugs are computed locally because published actors-common/lib can lag
the registry. TEST output is isolated from production upload; deployment,
history ingestion and complete catalogue reconciliation remain unverified.

Discovery follows only sitemap-products-N.xml from the sitemap index, never
category/image sitemaps. Product paths have arbitrary suffixes, including
letter-only codes, so requiring digits would lose valid products. Additional
filters reject category _c<ID> paths, known account/information routes, query
URLs and foreign hosts. The loyalty-programme entry is explicitly excluded.
Of 85,758 entries in the two product sitemaps, 85,757 remain candidates on
2026-11-16. This is not a verified saleable-product count. A detail response
without .product_detail increments nonProductPages and is never saved; a
malformed product layout fails extraction instead of silently losing data.

itemId is the internal SKU; slug and the registry/extension history key are
the final product path segment, including legacy nested _p<ID> paths.
