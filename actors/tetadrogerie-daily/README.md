# Teta Drogerie actor

Scrapes data from `https://www.tetadrogerie.cz/eshop`

* Uses hybrid approach: gets on the category page with browser and then gets all items via API.
  * The reason because the API endpoints with products do not work otherwise (possibly they need to be cached first).
* All neccessary values are comming from the JSON API endpoint.
* Listing pages are categories (`/eshop/produkty/<taxon>`, API `taxon=<taxon>`) and promotions
  (`/akce/detail/<action>`, API `action=<action>`).
* `"type": "BF"` scrapes the listing in `bfUrl` into `teta_cz_bf`, e.g. the Black Friday promotion
  `https://www.tetadrogerie.cz/akce/detail/sn26bf0001`.
* A run that scraped no products fails instead of uploading an empty table.
## Actors INPUT

```json
{}
```
