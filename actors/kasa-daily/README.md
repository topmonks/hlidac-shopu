# kasa.cz scraper

The actor will scrape all products from [kasa.cz](https://www.kasa.cz). It is going through the whole categories and pagination, gets the link to the product details and gets data in format as shown below.

Example item:

```json
{
  "currentPrice": 3499,
  "originalPrice": null,
  "discounted": false,
  "img": "https://img.kasa.cz/k-foto/280/4/7/5/product_4303574.jpg",
  "itemId": 1606087,
  "itemUrl": "https://www.kasa.cz/ssd-seagate-ironwolf-110-2-5-480gb-za480nm10011/",
  "itemName": "SSD Seagate IronWolf 110, 2.5\" 480GB (ZA480NM10011)",
  "category": "KASA.cz > Příslušenství > Příslušenství pro PC / notebooky > Pevné disky > SSD > Interní"
}
``` 
