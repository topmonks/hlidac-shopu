# Luxor actor
Apify actor for Luxor.cz eshop

## Actor input
Start page and page templates are defined in src/const.js

## How to switch type of scraper

There are a few types of scrapping - API, Front, Sitemap

The main scrapper is API type.
Sitemap is working like a product counter.
Frontend is unfinished base of scrapping via html code.

Scraper type can be selected by changing label property in main.js.

```
"label": API_START | FRONT_START | SITEMAP_START
```

```
  const req = {
    url: url,
    userData: {
      label: LABELS.API_LIST,
      page: pageNext,
      pageCount,
      slug: request.userData.slug,
      pageUrl,
      note: "NextPage"
    }
  };
```

## eShop API

### Product categories
https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1

.data

Cointain id (806), title (Knihy), slug (knihy), parent (

### Products on page
https://mw.luxor.cz/api/v1/products?page=1&size=24&sort=revenue%3Adesc&filter%5Bcategory%5D=knihy

.data[0]

id(393858), author(Karel Gott), in_stock (true), description, title(Má cesta za štěstím),
current_variant_price_group[0]{with_vat(1399), without_vat(1271.8181), currency(CZK), type(RECOMMENDED, SALE)}

### Products subcategories
https://mw.luxor.cz/api/v1/categories/slug/knihy

.data.children

id (224), title (Beletrie), slug (knihy-beletrie)

### Pagination
Pages at the bottom of page doesn't corespond with pages in the API

Total count 267348
Product on page: 24

API page 20000 have still data - same as page 15000

