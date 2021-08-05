# https://www.lidl.cz scraper

The actor will scrape all products from [https://www.lidl.cz/](https://www.lidl.cz/). It is going through the whole categories and pagination, gets the link to the product details and gets data in format as shown below.

Example item:

```json
{
  "itemId": "8722927",
  "itemUrl": "https://www.hornbach.cz/shop/Zahradni-sprcha-solarni-Uno-20/8722927/artikl.html",
  "itemName": "Zahradní sprcha solární Uno 20",
  "currency": "CZK",
  "img": "https://cdn.hornbach.cz/data/shop/D04/001/780/498/361/77/DV_157x152_8722927_03_4c_CZ_20181219181754.jpg",
  "currentPrice": 2490,
  "discounted": false
}
``` 
