# Megapixel

Black Friday only (#3666): the products in the Friday Noir categories, with the same fields as the other actors.

1. The Black Friday landing page https://www.megapixel.cz/slevove-akce-a-cashbacky ("Slevy a cashbacky ve Friday Noir")
   has a tile for each Friday Noir category, headed "Friday Noir: <name>" (Canon, Nikon, Příslušenství, Postproces,
   Ateliér, DZOFILM, Hollyland in November 2026; not all of them are `/friday-noir-*` URLs). The categories are
   discovered from these tiles, so a new one is picked up without a code change. The other tiles there (cashbacks,
   brand promotions) are not Friday Noir and are skipped.
2. Each category is server-rendered and paginated by `?page=<n>` (24 products per page). A product tile
   (`#snippet-productsFilter-products .js-product-box`) links the product detail and carries the product id in
   `onclick="onProductItem<id>Click(...)"` / `#picture-<id>` (the same id as `data-product-item-id` on the detail page).
   The tile also has the name, the image, the price (`.product-box__price`) and the crossed-out price
   (`.product-box__price-old`), so no detail page is opened. Cashbacks ("zpětná sleva") are not part of the price.
3. The products are uploaded to the `megapixel_cz_bf` table. The run fails without upload when nothing was scraped.

## Actor's INPUT

```json
{
  "type": "BF",
  "debug": false,
  "proxyGroups": ["CZECH_LUMINATI"],
  "urls": []
}
```

Use Czech proxies (`CZECH_LUMINATI`). Megapixel serves an Anubis bot wall ("Making sure you're not a bot!") to
the default datacenter and residential proxies, and the run then fails or scrapes only part of the products.

`"type": "TEST"` scrapes only the first page of the first category. `urls` replaces the discovered categories,
e.g. `[{ "url": "https://www.megapixel.cz/friday-noir-canon" }]`.

## Example output

```json
{
  "shop": "megapixel_cz",
  "shopOrigin": "megapixel.cz",
  "slug": "canon-eos-r50-rf-s-18-45-mm-f-4-5-6-3-is-stm-travel-kit-cerny",
  "itemId": "156858",
  "itemUrl": "https://www.megapixel.cz/canon-eos-r50-rf-s-18-45-mm-f-4-5-6-3-is-stm-travel-kit-cerny",
  "itemName": "Canon EOS R50 + RF-S 18-45 mm f/4,5-6,3 IS STM Travel Kit černý",
  "img": "https://cdn.megapixel.cz/images/product-w200h200/7/472307.jpg?v=1738657088",
  "currentPrice": 20490,
  "originalPrice": 24290,
  "currency": "CZK",
  "discounted": true,
  "inStock": true
}
```
