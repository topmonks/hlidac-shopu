# datart.cz actor

## Actors INPUT
<sup>~ apify_storage/key_value_stores/default/INPUT.json</sup>

```json
{
  "development": true,
  "debug": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 10,
  "type": "FULL",
  "country": "CZ"
}
```
```text
"type": "FULL" || "BF" || "TEST"
"country": "CZ" || "SK"
```
## Actors item example OUTPUT
```json
{
  "itemId": "564281",
  "itemName": "Dron Autel Robotics EVO II 8K oranžový",
  "itemUrl": "https://www.datart.cz/dron-autel-robotics-evo-ii-8k-oranzovy.html",
  "img": "https://static.datart.cz/dron-autel-robotics-evo-ii-8k-oranzovy/media_4238454.jpg?size=500",
  "currentPrice": 27990,
  "originalPrice": 43990,
  "currency": "CZK",
  "category": [
    "Datart.cz",
    "Produkty",
    "Chytré produkty",
    "Chytré hračky",
    "Kvadrokoptéry, drony a RC modely"
  ],
  "discounted": false
}
```
## S3 example OUTPUT
```json
{
  "@scope": "https://schema.org/",
  "@type": "Product",
  "sku": "564281",
  "name": "Dron Autel Robotics EVO II 8K oranžový",
  "url": "https://www.datart.cz/dron-autel-robotics-evo-ii-8k-oranzovy.html",
  "image": "https://static.datart.cz/dron-autel-robotics-evo-ii-8k-oranzovy/media_4238454.jpg?size=500",
  "category": [
    "Datart.cz",
    "Produkty",
    "Chytré produkty",
    "Chytré hračky",
    "Kvadrokoptéry, drony a RC modely"
  ],
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "price": 27990,
    "priceCurrency": "CZK"
  }
}
```
