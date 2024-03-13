## Ikea scraper

HTTP crawler, that uses Search API to scrape products from root categories.
List of categories is scraped from IKEA HP of given region.

It supports countries: CZ, SK, HU, DE, AT, PL. Countries are changed on input by user. Example input:

```json
{
  "maxRequestRetries": 3,
  "type": "FULL",
  "country": "cz"
}
```

```text
"type": "FULL"
"country": "cz" || "sk" || "pl"|| "at"|| "de"|| "hu"
"urls": RequestLike[]
```

Example output:

```json
{
  "slug": "60348875",
  "itemId": "60348875",
  "itemImg": "https://www.ikea.com/cz/cs/images/products/kivik-potah-3mist-pohovky-hillared-tm-modra__0515786_pe640041_s5.jpg",
  "itemName": "KIVIK: Potah 3míst. pohovky - Hillared tm.modrá",
  "itemUrl": "https://www.ikea.com/cz/cs/p/kivik-potah-3mist-pohovky-hillared-tm-modra-60348875/",
  "currentPrice": 4490,
  "originalPrice": 4990,
  "discounted": true,
  "inStock": true,
  "sale": null,
  "currency": "CZK",
  "rating": 4.4,
  "numberOfReviews": 16,
  "category": "Nábytek > Pohovky > Náhradní potahy pro pohovky a křesla"
}
```
