# Conrad actor
Apify actor for Conrad.cz eshop


## How to switch type of scraper

There are a few types of scrapping - FULL, COUNT and TEST

The main scrapper is API type.
Sitemap is working like a product counter.

Scraper type can be selected by changing label property in INPUT.json (use raw text).
If not INPUT.json used, change this value in main.js (use labels).


```
// main.js
const {
  development = true,
  type = TYPE.FULL,
  maxConcurrency = 100,
  maxRequestRetries = 8,
  proxyGroups = ["CZECH_LUMINATI"]
} = input ?? {};
```

