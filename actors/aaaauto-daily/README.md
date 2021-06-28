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
  "type": "FULL"
}
```
## Actors item example OUTPUT

```json
{
  "itemUrl": "https://www.aaaauto.sk/sk/hyundai-tucson/car.html?id=399451975#limit=50&promo=b",
  "itemId": "399451975",
  "description": "FAMILY, VIN: TMAJ3811AHJ340246",
  "img": "https://aaaautoeuimg.vshcdn.net/thumb/700097495_640x480x95.jpg?80456",
  "itemName": "Hyundai Tucson",
  "currentPrice": "16500",
  "currency": "Eur",
  "actionPrice": 14500,
  "discounted": false,
  "year": " 2017",
  "km": " 38 611 km",
  "transmission": " 6 stupňov",
  "fuelType": " Benzín",
  "engine": "1.6 GDI / 97kW"
}
```
