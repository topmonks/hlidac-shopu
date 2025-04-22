# Tips and advice for beginners

## How to start with the HlidacShopu actor

Do not use  `apify create`. This is a way to create an actor for Apify,
not for HlidacShopu. The better way is to copy the existing actor and modif it.
Some modules then don’t match and aren’t configured correctly for the HlidacShopu
at the beginning of the code that the input data is filled in correctly.
In otherwise case, it is possible to create an actor via `apify create`, but it will be necessary
to add missing data - see in other actors.

## Beware of product sorting
If sorting is not defined, there can some recommended products exist in the product list.
Therefore, it is better to sort the list of products, e.g., from the cheapest alphabetically.

## API processing via RequestAsBrowser / gotScraping
Usage `Apify.utils.requestAsBrowser` is forbidden. Use `HttpCrawler` for all requests, it is enough for most use cases.

## How to see CI log of the pushed actor changes
https://docs.apify.com/crawling-basics/scraping-the-data#review-code

Here you can monitor CI errors to avoid blocking other people's code testing.
Notifications are sent by e-mail or in the `#ntf-hlidac-shop` channel on Slack too.

## Number of products on the page
It is usually safe to keep the original number of products per page,
which is normally loaded in the e-shop.

## Register eshop in shop.mjs
Don't forget to add an actor to`lib/shops.mjs` file.
You can get inspiration from DM or 4camping actors, which are presentable.

```
["luxor_cz", {
  name: "Luxor.cz",
  currency: "CZK",
  logo: "luxor_logo",
  url: "https://www.luxor.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substr(1).match(/[^\/]+$/)?.[0]
    };
  }
}],
```

## Register actor test in shops-test.mjs
Add test to lib/shops-test.mjs
```
describe("shopName", () => {
  ["https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126", "luxor_cz"]
  ...
describe("shopSlug", () => {
  ["https://www.luxor.cz/product/ma-cesta-za-stestim-zbo000418126", "ma-cesta-za-stestim-zbo000418126"]
  ...
```

## Product properties
```
shop* -- use `shopName` function from `@hlidacshopu/actors-common/product.js`
shopOrigin -- use `shopOrigin` function from `@hlidacshopu/actors-common/product.js`
slug*  -- our product identifier used as key in KV story, has to be unique on the origin/shop; use `itemSlug` function from `@hlidacshopu/actors-common/product.js`
itemId* -- origin/shop ID, SKU or GTIN
itemUrl* -- full absolute URL of the product detail page
itemName*
img*
discounted,*
originalPrice
currency
currentPrice
category
inStock  [true]

Legend:
* Required
[ ] Default value
```

## Recommended tools

### JSON formatter
to easy formating & reading of unformated JSON
https://jsonformatter.org/

### Plugin to Chrome
https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa?hl=en

### Regex tester
https://regex101.com/

## How to prepare an actor for production

* Push last changes to Hlidac GIT repository

* Open Apify console of HlidacShopu under HlidacShopu account
https://console.apify.com/organization/iMWJjifpQdTwbkKYn/actors/d2zzhc6xL9dHwdlNQ#/source

* Duplicate actor via Actors menu on top right corner - it will clone actor with keys and passwords
  
* Source tab - Change GIT url to new actor

* Settings tab - Usual memory for BasicCrawler is 2048 or 4096


