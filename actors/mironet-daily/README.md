# mironet.cz actor

## Actors INPUT

```json
{
  "development": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 10,
  "type": "FULL"
}
```

`"type": "BF"` scrapes the Black Friday page (`bfUrl`, by default https://www.mironet.cz/vyprodej/?v=black-friday)
into the `mironet_bf` table. The page lists all Black Friday products itself and is paginated by `PgID` like a category
(24 products per page). Its category tiles are not followed: their subcategory links drop the Black Friday filter,
which used to crawl the whole catalogue.

### Full run speed

- Pages 2+ of a category are loaded from `/Ajax/axmoreprod?ScriptName=default&CatId=<id>&PgID=1&nNext=<page>`, the
  endpoint of the "24 dalších" button. It needs the `X-Requested-With: XMLHttpRequest` header (400 without it) and
  returns `{ html }` with just the product tiles of the page, ~350 kB instead of the ~1 MB regular page. Breadcrumbs
  are read from the first page. When the endpoint answers with an error, no JSON or no products, the regular page is
  loaded instead (`ajaxFallbacks` in the stats). `"useAjaxPages": false` loads only the regular pages.
- `"urls": [...]` with `"type": "FULL"` scrapes only these categories instead of the whole sitemap, e.g. to compare
  two runs on the same categories.
- Run it with 4096 MB of memory. With 2048 MB (half a CPU) parsing the pages overloads the CPU and the crawler stays at
  ~5 parallel requests (~53 requests/min, 16 h); with 4096 MB it runs ~280 requests/min.
