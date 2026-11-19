# mironet.cz actor

## Actors INPUT

```json
{
  "development": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 10,
  "type": "FULL",
  "proxyGroups": ["UNBLOCKER"]
}
```

### Proxy

The site has a bot check since November 2026 (#3698): the Czech residential route (`CZECH_LUMINATI`, the default of
`getInput`) is refused outright (proxy 590), `RESIDENTIAL` lands on the `/altcha/verify` challenge page on every
request and datacenter IPs on about a fifth of them. Only `UNBLOCKER` gets the listings, so the task has to set
`"proxyGroups": ["UNBLOCKER"]`. It is billed per request (~$1.25 per 1 000 on the Scale plan): a full run of ~15 700
pages and ~365 000 products costs ~$25 instead of ~$3. It answers the AJAX endpoint below with 502, so `useAjaxPages`
defaults to `false`. A run without products fails instead of uploading an empty table.

`"type": "BF"` scrapes the Black Friday page (`bfUrl`, by default https://www.mironet.cz/vyprodej/?v=black-friday)
into the `mironet_bf` table. The page lists all Black Friday products itself and is paginated by `PgID` like a category
(24 products per page). Its category tiles are not followed: their subcategory links drop the Black Friday filter,
which used to crawl the whole catalogue.

### Full run speed

- Pages 2+ of a category are loaded from `/Ajax/axmoreprod?ScriptName=default&CatId=<id>&PgID=1&nNext=<page>`, the
  endpoint of the "24 dalších" button. It needs the `X-Requested-With: XMLHttpRequest` header (400 without it) and
  returns `{ html }` with just the product tiles of the page, ~350 kB instead of the ~1 MB regular page. Breadcrumbs
  are read from the first page. When the endpoint answers with an error, no JSON or no products, the regular page is
  loaded instead (`ajaxFallbacks` in the stats). `"useAjaxPages": true` turns it on, the `UNBLOCKER` proxy answers the
  endpoint with 502.
- Only the top-level categories of the sitemap are scraped (~190 of ~8 200): a category lists the products of all its
  subcategories, so reading every category read each product ~3 times. On 16 category trees this found the same
  products (37 780 of 37 781) with 1 602 instead of 5 826 requests. `breadCrumbs` are those of the top-level category
  (1–3 levels instead of the leaf path). `"useRootCategories": false` reads every category again.
- The number of pages comes from the product count (`#ItemCount`): the pagination links stop at page 416 (~10 000
  products), the pages after it exist (e.g. 577 pages of puzzles).
- `"urls": [...]` with `"type": "FULL"` scrapes only these categories instead of the whole sitemap, e.g. to compare
  two runs on the same categories.
- Run it with 4096 MB of memory. With 2048 MB (half a CPU) parsing the pages overloads the CPU and the crawler stays at
  ~5 parallel requests (~53 requests/min, 16 h); with 4096 MB it runs ~280 requests/min.
