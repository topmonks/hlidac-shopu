# Drogerie Markt actor

Scrapes data from JSON API on 
`https://products.dm.de/product/${countryCode}/search?productQuery=${productQuery}&purchasableOnly=true&hideFacets=false&hideSorts=true&pageSize=100`

* Max supported `pageSize` is `100`
* Default `productQuery` can be `:allCategories`
* Categories are listed in JSON feed `categories` property. `productQuery` can be obtained there.
* Pagination can be driven by `pagination` property.
* Supported country codes: `cz`, `sk`, `pl`, `hu`, `de`, `at`
* item ID is `gtin`, pattern in detail URL `.*-p(\d+).html`

## Actors INPUT

You can choose `country` by country code and `productQuery`. Default values are:

```json
{"country": "cz",
 "productQuery": ":allCategories"}
```