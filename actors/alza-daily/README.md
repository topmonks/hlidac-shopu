# https://www.alza.cz scraper

The actor scrapes all products of [Alza.cz](https://www.alza.cz/) or [Alza.sk](https://www.alza.sk/)
from the API of the Alza mobile app. The website is behind a Cloudflare challenge, the API is not.

## How it works

1. `/v1/floors` lists the sections of the home page, `/v1/category/{id}` lists the subcategories.
2. `/v2/products` lists 25 products of a category per page.
3. `/api/router/legacy/catalog/product/{id}` is the detail of a product with variants.

A listing contains the products of its subcategories, so the actor paginates only

- the topmost listing below the sections (Počítače a notebooky > **Notebooky**), and
- the related categories, which are shown next to the subcategories, but their products are not
  in the parent listing (Projektory > **Plátna**).

The listings still overlap, every product is saved once.

`currentPrice` is the displayed price of one piece, `originalPrice` is the struck-through one.
A product with variants ("Skladem dle varianty") is listed with the price of its cheapest variant,
but its page shows another one, so its price is taken from the product detail.
The price with a discount code ("Koupit s kódem X") is the current one, as in the extension.
A product which cannot be bought often has no price, such a product is skipped.

## Input

| Field | Default | |
| --- | --- | --- |
| `country` | `CZ` | `CZ` or `SK` |
| `type` | `FULL` | `TEST` scrapes one category |
| `categoryIds` | | scrape only these categories or sections, e.g. `[18842920]` for Notebooky |
| `proxyGroups` | | datacenter proxies (`[]`) are enough |

## Example item

```json
{
  "itemId": "13436021",
  "itemName": "Acer Aspire Lite 15 Light Silver (AL15-34P) (bez adaptéru)",
  "itemUrl": "https://www.alza.cz/acer-aspire-lite-15-light-silver-al15-34p-d13436021.htm",
  "slug": "13436021",
  "img": "https://image.alza.cz/products/NC027p9y4a/NC027p9y4a.jpg?width=190&height=190",
  "inStock": true,
  "currentPrice": 8990,
  "originalPrice": 10990,
  "discounted": true,
  "currency": "CZK",
  "itemCode": "NC027p9y4a",
  "rating": 0,
  "breadCrumbs": "Počítače a notebooky > Notebooky"
}
```
