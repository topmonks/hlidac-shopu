# AAA Prices scraper

Scrapes prices of all car offers on AAAAuto.cz

## Actors INPUT
<sup>~ apify_storage/key_value_stores/default/INPUT.json</sup>

```json
{
  "development": false,
  "debug": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 10,
  "country": "CZ"
}
```
```text
"country": "CZ" || "SK"
```
## Actors item example OUTPUT

```json
{
  "itemUrl": "https://www.aaaauto.cz/detail/skoda/superb/30311332",
  "itemId": "30311332",
  "description": "2.0 TDI, 4x4, Automat, Kuze, Navi",
  "img": "https://aaaautoeuimg.vshcdn.net/thumb/900590383_1024x768x95.jpg",
  "itemName": "Skoda Superb",
  "currentPrice": "210000",
  "originalPrice": 220000,
  "currency": "Kc",
  "actionPrice": 210000,
  "discounted": true,
  "year": 2016,
  "km": "311285 km",
  "transmission": "Automaticka",
  "fuelType": "Diesel",
  "engine": "2.0 TDI"
}
```
