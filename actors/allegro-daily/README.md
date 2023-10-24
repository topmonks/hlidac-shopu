# allegro-daily

# Example input

```json
{
    "development": true,
    "debug": false,
    "proxyGroups": [],
    "type": "FULL",
    "categories": [
        "elektronika"
    ]
}
```

The scraper will filter found top-level categories based on the input (will scrape only "Elektronika" category in example above) to limit the number of results. If none are inputted or `categories` is null, it will scrape all categories.

Currently available top-level categories: Elektronika, Móda, Dům a zahrada, Supermarket, Děti, Krása, Zdraví, Kultura a zábava, Sport a cestování, Auto-moto, Sbírky a umění, Obchod a služby

# Example output

```json
{
    "itemId": 13768269820,
    "itemName": "Chytrý telefon Xiaomi Redmi Note 12 Pro 5G 8 GB / 256 GB černý",
    "itemUrl": "https://allegro.cz/events/clicks?emission_unit_id=61363b99-1bf5-4444-8c6a-7a65119e2f5e&emission_id=c5a85bda-876a-4359-89fc-9480e806adf3&type=OFFER&ts=1697911347827&redirect=https%3A%2F%2Fallegro.cz%2Fnabidka%2Fsmartphone-xiaomi-redmi-note-12-pro-5g-8-gb-256-13768269820%3Fbi_s%3Dads%26bi_m%3Dproductlisting%253Adesktop%253Acategory%26bi_c%3DN2UzOGQ2ZjAtOWVjZi00NDE0LWEwMDktOTgxOGVlNjhlNjRkAA%26bi_t%3Dape&placement=productlisting:desktop:category&sig=800cd86f2e6840cce8892f347bda6ee1",
    "img": "https://a.allegroimg.com/s180/29008e/293bb39a4520a4554ec5a39ff059/Smartphone-Xiaomi-Redmi-Note-12-Pro-5G-8-GB-256",
    "currentPrice": 7990,
    "inStock": true,
    "originalPrice": 8990,
    "discounted": true,
    "currency": "CZK",
    "category": [
        "Elektronika",
        "Telefony a příslušenství",
        "Smartphony a mobilní telefony"
    ]
}
```

# notes

- the Actor currently scrapes sub-categories to level 3 (will be probably changed later, level will be obtained from the input)
- currently we can scrape max ~7200 items per category (max 72 items per page, max 100 pages per category), to get more we would need to use filters but there's no need for that now