# mironet.cz actor

## Actors INPUT

```json
{
  "development": false,
  "maxRequestRetries": 3,
  "type": "FULL"
}
```

`"type": "BF"` scrapes the Black Friday page (`bfUrl`, by default https://www.mironet.cz/vyprodej/?v=black-friday)
into the `mironet_bf` table. The page lists all Black Friday products itself and is paginated by `PgID` like a category
(24 products per page). Its category tiles are not followed: their subcategory links drop the Black Friday filter,
which used to crawl the whole catalogue.

### Crawling

- The sitemap and regular HTML listing pages use Apify's `UNBLOCKER` proxy group. `"development": true` skips the
  Keboola upload.
- Only the top-level categories of the sitemap are scraped (~190 of ~8 200): a category lists the products of all its
  subcategories, so reading every category read each product ~3 times. On 16 category trees this found the same
  products (37 780 of 37 781) with 1 602 instead of 5 826 requests. `breadCrumbs` are those of the top-level category
  (1–3 levels instead of the leaf path). `"useRootCategories": false` reads every category again.
- The number of pages comes from the product count (`#ItemCount`). The pagination links stop at page 416
  (~10 000 products), and later pages remain accessible.
- `"urls": [...]` with `"type": "FULL"` limits the crawl to the supplied categories.
- On Apify, the Actor uses the run's cloud request queue and reads saved product IDs from the dataset when it starts.
- A run without products fails before uploading to Keboola. Use 4096 MB of memory for full runs.
