# Tips and advices for beginners

## How to start with actor HlidacShopu
Please don't start a new actor via "Apify create". It is a way to create an actor for Apify,
not for HlidacShopu. Better way is to copy the already functional actor and edit.
Some modules then do not match and are not configured correctly for the HlidacShopu
at the beginning of the code that the input data is filled in correctly
In otherwise case is possible to create actor via "Apify create", but it will needed
to add missing data - see in another actors

## Beware of product sorting
If sorting is not defined, there can some recommended products exists in the product list.
Therefore, it is better to sort the list of products, for ex. from the cheapest alphabetically.

## API processing via RequestAsBrowser / gotScraping
Apify.utils.requestAsBrowser je deprecated, místo něj používat gotScraping.

## How to see CI log of pushed actor
https://docs.apify.com/crawling-basics/scraping-the-data#review-code

Here you can monitor CI errors to avoid blocking other people's code testing.
The notification is sent by e-mail or in the #ntf-hlidac-shop channel on Slack too.

## Number of products on page
It is usually safe to keep the original number of products per page,
which is normally loaded in the e-shop.

## Register eshop in shop.mjs
Do not forget to add actor to lib/shops.mjs file.
You can let inspire in DM or Alza actors, which are presentable.

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
itemId*
itemUrl*
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

## How to prepare actor for production

* Push last changes to Hlidac GIT repository

* Open Apify console of HlidacShopu under HlidacShopu account
https://console.apify.com/organization/iMWJjifpQdTwbkKYn/actors/d2zzhc6xL9dHwdlNQ#/source

* Duplicate actor via Actors menu on top right corner - it will clone actor with keys and passwords
  
* Source tab - Change GIT url to new actor

* Settings tab - Usual memory for BasicCrawler is 2048 or 4096


