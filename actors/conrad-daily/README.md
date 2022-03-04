# Conrad actor
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
https://www.conrad.cz/restservices/CZ/megamenu

```
{
  "statusCode": "SUCCESS",
  "body": [
  {
    "title": "Aktivní součástky",
    "url": "/t/aktivni-soucastky-t12",
    "imageUrl": "/binaries/content/gallery/shared-images/t23-lvl1-semiconductorsjpg",
    "icon": "/binaries/content/gallery/shared-images/categories-icons/componenten---actief.svg",
    "children": [
    {
      "title": "ESD-ochrana",
      "url": "/c/esd-ochrana-c27822",
      "children": [
      {
        "title": "ESD SMD boxy",
        "url": "/o/esd-smd-boxy-0203060"
      },
```

### How to get APIKEY
https://www.conrad.cz

```
<script id="globals">
    window.globals = Object.assign({}, window.globals, {
        pageId: 'home',
        services: {
            apiKey: 'SXc41FXfyxa0eL5MCBW1UyDGUVTG1D3X',
```

### How to get products ID list
https://api.conrad.com/search/1/v3/facetSearch/CZ/cs/b2c?apikey=SXc41FXfyxa0eL5MCBW1UyDGUVTG1D3X

Page: "from": 0
Product count: "size": 30

Request payload
```
{
    "facetFilter": [],
    "from": 0,
    "globalFilter": [
        {
            "field": "categoryId",
            "type": "TERM_OR",
            "values": [
                "0203060"
            ]
        }
    ],
    "query": "",
    "size": 30,
    "sort": [
        {
            "field": "price",
            "order": "asc"
        }
    ],
    "disabledFeatures": [
        "FIRST_LEVEL_CATEGORIES_ONLY"
    ],
    "enabledFeatures": [
        "and_filters"
    ]
}
```


https://api.conrad.com/reco/3?apikey=SXc41FXfyxa0eL5MCBW1UyDGUVTG1D3X

```
{
  "version": 1,
  "startTimestamp": "2022-03-04T16:15:42.433179Z",
  "endTimestamp": "2022-03-04T16:15:42.442517Z",
  "outputs": {
    "reco_products": "749507,1514239,2376390,820021,1881772,1565914,593686,125691,759903,2147495"
  }
}
```

### Products on page
Showed products
https://www.conrad.cz/restservices/CZ/products/products?id=530941&id=530943&id=528255&id=524715&id=530924&id=530918&id=531318&id=531029&id=1888210&id=2238025

Product prices and availabilities (subcategory)
Empty request payload
https://www.conrad.cz/restservices/CZ/products/pricesAndAvailabilities?net=false&id=1298772&id=1298771


```
{
  "statusCode": "SUCCESS",
  "body": [
  {
    "id": "530941",
    "brand": {
      "id": "Brand.2862",
      "name": "Spelsberg",
      "image": {
        "url": "https://asset.conrad.com/media10/isa/160267/c1/-/cs/ELS-SPELSBERG_FL_00/image.jpg",
        "type": "Vendor Logo"
      },
      "url": "Spelsberg"
    },
    "categoryId": "0203045",
    "categoryName": "Nástěnné a instalační rozváděče",
    "image": {
      "url": "https://asset.conrad.com/media10/isa/160267/c1/-/cs/531010_RB_00_FB/image.jpg",
      "type": "Primary Like Image"
    },
    "title": "instalační krabička Spelsberg TK PS 1809-8-t, (d x š x v) 180 x 94 x 81 mm, N/A, 1 ks",
    "urlPath": "/p/instalacni-krabicka-spelsberg-tk-ps-1809-8-t-d-x-s-x-v-180-x-94-x-81-mm-na-1-ks-530941",
    "rating": {
      "reviewCount": 0,
      "percentRating": 0
    },
    "price": {
      "crossedOut": {
        "gross": 453
      },
      "unit": {
        "net": 347.93,
        "gross": 421
      },
      "savedAmount": 32,
      "vatPercentage": 21,
      "currency": "CZK",
      "freeShipping": false,
      "pricedAttributes": [],
      "priceScale": []
    },
    "availability": {
      "stockQuantity": 6,
      "availabilityColor": "GREEN",
      "inStockArticle": true,
      "deliveryTimeUnit": "DAYS",
      "deliveryTimeUpperBound": 6,
      "availabilityDate": "2022-03-04",
      "lowerPromisedDeliveryDate": "2022-03-09",
      "upperPromisedDeliveryDate": "2022-03-15",
      "lowerPromisedDeliveryDayOfWeek": "WEDNESDAY",
      "upperPromisedDeliveryDayOfWeek": "TUESDAY"
    },
    "exclusion": {
      "exclusion": false,
      "b2b": false,
      "education": false
    }
  },
```

### Pagination



