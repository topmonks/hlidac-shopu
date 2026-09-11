# tsbohemia.cz actor

Scrapes the whole catalog (~75 000 active products) from the shop's own sitemap.

## Actors INPUT

<sup>~ apify_storage/key_value_stores/default/INPUT.json</sup>

```json
{
  "development": false,
  "debug": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 4,
  "maxRequestsPerMinute": 120,
  "type": "FULL"
}
```

```text
"type": "FULL" || "COUNT" || "TEST" || "BF"
```

`COUNT` does not scrape — it only sums the `<loc>` entries of the active product
sitemaps and reports them as `expectedProducts`. Use it as the coverage baseline
to check a `FULL` run against.

## Actors item example OUTPUT

```json
{
  "shop": "tsbohemia",
  "shopOrigin": "tsbohemia.cz",
  "slug": "555711",
  "itemId": "555711",
  "itemUrl": "https://www.tsbohemia.cz/65-samsung-qe65s90f-2025_d555711",
  "itemName": "65\" SAMSUNG QE65S90F (2025)",
  "img": "https://interlink-static3.tsbohemia.cz/65-samsung-qe65s90f-2025_ig555711.jpg",
  "currentPrice": 27490,
  "originalPrice": 28698,
  "discounted": true,
  "currency": "CZK",
  "inStock": true,
  "category": "Elektronika > Televize"
}
```

## Notes

**Discovery.** `sitemap.xml` is an index of ~2 750 shards. Only
`sitemap-categories-N-cs.xml` (10 shards, 9 594 categories) is crawled;
`sitemap-products-disabled-*` lists ~430 000 delisted SKUs and the
`-accessories/-reviews/-consultations` shards are secondary pages.

**Pagination.** Every category is paginated with `?page=N` and duplicates are
dropped by `itemId`. Parents are paginated too — `categoryDetail.children` is
not a partition, it mixes filter facets (4K, Smart TV) with real sibling
categories (Reproduktory, Soundbary), so skipping parents is unsafe in both
directions. Measured: parent `televize_c5622` lists 433 products, the union of
its children 1 062. Costs ~24 000 page fetches (5.8× redundancy), ~3–4 h.

**Prices** come from each page's JSON-LD `ItemList`, not from
`__NEXT_DATA__.pricesFor[]` — that node's `originalPrice` is always `0`,
`discountPrice` always `-1`, and `priceVat` is the regular rather than the
selling price. JSON-LD's `SalePrice` is `currentPrice` and `RegularPrice` is
`originalPrice`; `RegularPrice` is emitted only when the product is discounted.
Note `SalePrice` is often a coupon price with an auto-applied code — we follow
the shop's own declaration.

**Anti-bot.** The site is behind a Cloudflare managed challenge
(`cf-mitigated: challenge`) that scores the TLS handshake before reading any
header, so curl/node-fetch/got-scraping get a 403 stub. `impit` replays a real
Chrome ClientHello and passes outright — no headless browser, no cookie solver
and no proxy, unlike `datart-daily` (F5) or `lidl-daily` (Myra). The legacy
`_jx.asp` endpoints stay 403 but are not needed.

**Rate limiting.** The shop answers 429 well before Cloudflare does — a run at
concurrency 8 / 240 rpm drew 28 hard failures in ~90 s. A 429 holds the worker
for `10s × (retryCount + 1)`, capped at 30 s, before requeueing.

**`category`** is the breadcrumb of whichever category listed the product first,
which depends on sitemap shard order — a TV can come out as `"Samsung"` rather
than `"Elektronika > Televize"`. Dedup is keyed on `itemId`, never on category.

**Keboola tables.** `FULL` uploads to `tsbohemia`, `BF` to `tsbohemia_bf`. The
older `tsbohemia-daily` actor owns `tsbohemia_cz_price`; its FULL/BF modes
produce no items, and the uploader skips empty datasets, so the two cannot
overwrite each other.
