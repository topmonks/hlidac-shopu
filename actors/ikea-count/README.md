## Ikea scraper
Cheerio crawler, that uses datacenter proxies and [sitemap](https://www.ikea.com/sitemaps/sitemap.xml) for scraping product count on [ikea](https://www.ikea.com/) website.

It supports countries: CZ, SK, HU, DE, AT, PL.
Countries are changed on input by user.
Example input:
```json
{
    "country": "hu"
}
```

Example output:
```json
{
  "numberOfProducts": 12523
}
```
