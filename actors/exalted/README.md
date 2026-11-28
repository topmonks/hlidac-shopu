# exalted.com (CZ / SK)

https://exalted.com/ is a Nuxt SPA on top of Vendure. All markets live on one domain,
the locale is the first path segment (`/cs/…` = CZK, `/sk/…` = EUR). Product ID in the URL
(`/cs/products/214/womens-nest-hoodie-black` → `214`) is shared across locales.

1. `start` – downloads the products sitemap `https://exalted.com/__sitemap__/products.xml`
   (~17 MB, every product once per locale) and queues detail URLs of the requested locale.
2. `detail` – reads the server-rendered Nuxt payload (`<script id="__NUXT_DATA__">`, devalue format)
   and takes the Vendure product from it:
   - `currentPrice` = cheapest variant `price`, `originalPrice` = its `priceBeforeDiscount`
     (both in minor units, divided by 100), only when higher than the current price
   - `inStock` = any variant with `stockLevel !== "OUT_OF_STOCK"`
   - `category` = gender > type from product collections
   - falls back to JSON-LD (`Product.offers`) when the payload is missing

`/api/` is disallowed in robots.txt, so the actor uses only public HTML pages and the sitemap.

`shop`, `shopOrigin` and `slug` are computed in the actor (`exalted_cz` / `exalted.cz` / product ID)
to match `lib/shops.mjs`, so it does not depend on a published `@hlidac-shopu/lib` release.

## Actor's INPUT

```json
{
  "country": "CZ" || "SK",
  "type": "FULL" || "TEST",
  "urls": ["https://exalted.com/cs/products/214/womens-nest-hoodie-black"]
}
```

`TEST` scrapes only the first 10 products from the sitemap. `urls` skips the sitemap and scrapes
the given product pages only.

Keboola table: `exalted_cz` / `exalted_sk`.
