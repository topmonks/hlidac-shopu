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
