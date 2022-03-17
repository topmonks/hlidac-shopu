# Luxor actor
Apify actor for Luxor.cz eshop

## Actor input
Start page and page templates are defined in src/const.js

## How to switch type of scraper

There are a few types of scrapping - API, Front, Sitemap

The main scrapper is API type.
Sitemap is working like a product counter.
Frontend is unfinished base of scrapping via html code.

Scraper type can be selected by changing label property in INPUT.json (use raw text).
If not INPUT.json used, change this value in main.js (use labels).

```
// const.js
// API-START | SITEMAP-START
{
  "type": "SITEMAP-START"
}

```


```
// main.js
const {
  development = true,
  type = LABELS.API_START, // LABELS.API_START | LABELS.SITEMAP_START
  maxConcurrency = 100,
  maxRequestRetries = 4,
  proxyGroups = ["CZECH_LUMINATI"]
} = input ?? {};
```

## eShop API

### Product categories

### Products on page

### Products subcategories

### Pagination
