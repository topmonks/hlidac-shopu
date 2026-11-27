# Skyman daily actor

Follows the products entry of https://www.skyman.cz/sitemap.xml, decompresses
sitemap-products.xml.gz and collects Czech /p/ URLs only. On 2026-11-16 the
sitemap contained **10,553** Czech product/variant URLs, grouped into **4,707**
parent pages; other language versions are excluded. Numeric variant paths
and hash links map to the same history key. Every variant listed in the
sitemap must also be present in its parent table, or the run fails.

The main Product microdata supplies the VAT-inclusive price and availability.
The displayed .standard_pricex is the reference price when greater than the
selling price. The server-rendered variant table supplies separate variant
records, keyed by product path plus numeric hash ID. The base URL keeps its
own representative price. Tables do not show a variant reference price, so it
is null instead of copying the parent's reference price. AJAX endpoints
blocked by robots.txt are never used.

One navigation runs at a time with a 2.1 second delay. Runtime robots.txt
checking is enabled. Results are uploaded before checking crawl quality. More than 1% failed
requests or fewer than 10 saved products fail a FULL run; TEST requires one product.
FULL uploads to skyman_cz outside development; TEST never uploads.

Run `yarn workspace @hlidac-shopu/skyman-daily start` with Apify input:

```json
{"development":true,"type":"TEST","maxRequestRetries":0}
```

The default sample reads three products. Optional `urls` accepts up to 20
product pages. Use fresh local storage for independent samples.

Fixtures are real product-page excerpts captured 2026-11-16 (canonical URLs
are preserved in meta[itemprop=url]). They preserve price and variant tables;
unrelated scripts, forms, navigation and customer content are excluded.

Recognized product pages without a selling price are counted as unpricedItems
and skipped; malformed priced products count as failed requests.

Robots.txt was checked on 2026-11-16: the wildcard user-agent has no
Crawl-delay directive. The conservative 2.1-second pause and concurrency 1
also apply to retries; runtime robots.txt path checking remains enabled.
Actor slugs are computed locally because published actors-common/lib can lag
the registry. TEST output is isolated from production upload; deployment,
history ingestion and complete catalogue reconciliation remain unverified.

itemId is the internal product/conversion ID (data-product-id on the parent,
data-conversion_product_id on variants). The history slug and registry/extension
key use the /p/ path, plus -<variant ID> for variants; numeric-path and hash
variant URLs resolve to the same key.
