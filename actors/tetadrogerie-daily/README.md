# Teta Drogerie actor

Scrapes data from `https://www.tetadrogerie.cz/eshop`

* Uses hybrid approach: gets on the category page with browser and then gets all items via API.
  * The reason because the API endpoints with products do not work otherwise (possibly they need to be cached first).
* All neccessary values are comming from the JSON API endpoint.
## Actors INPUT

```json
{}
```
