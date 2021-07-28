## Ikea scraper
Cheerio crawler, that uses datacenter proxies and [sitemap](https://www.ikea.com/sitemaps/sitemap.xml) for scraping all the products from [ikea](https://www.ikea.com/) website.

It supports countries: CZ, SK, HU, DE, AT, PL.
Countries are changed on input by user.
Example input:
```json
{
    "country": "cz"
}
```

Example output:
```json
{
    "itemName": "KIVIK: Potah 3míst. pohovky - Hillared tm.modrá",
    "itemUrl": "https://www.ikea.com/cz/cs/p/kivik-potah-3mist-pohovky-hillared-tm-modra-60348875/",
    "currentPrice": 4490,
    "originalPrice": 4990,
    "discounted": true,
    "inStock": true,
    "itemId": "60348875",
    "itemImg": "https://www.ikea.com/cz/cs/images/products/kivik-potah-3mist-pohovky-hillared-tm-modra__0515786_pe640041_s5.jpg",
    "sale": 10,
    "currency": "CZK",
    "rating": "4.4",
    "numberOfReviews": "16",
    "category": [
        "Produkty",
        "Nábytek",
        "Pohovky",
        "Náhradní potahy pro pohovky a křesla",
        "KIVIK"
    ]
}
```
