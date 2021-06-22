# Okay scraper

The actor will scrape all products from [Okay.cz](https://www.okay.cz/) or [Okay.sk](https://www.okay.sk/). 
It is going through the whole categories and pagination, gets the link to the product details and gets data in format as shown below.

Example item:
``` 
{
  "itemUrl": "https://www.okay.cz/oled-televize-philips-55oled754-12-2019-55-139cm/",
  "itemId": 583025,
  "itemName": "OLED televize Philips 55OLED754/12(2019) / 55\" (139cm)",
  "currentPrice": 27150,
  "originalPrice": 44999,
  "discounted": true,
  "breadcrumb": "ELEKTRO »Televize »Úhlopříčka TV »TV s úhlopříčkou 55\" (139 cm) »OLED televize Philips 55OLED754/12(2019) / 55\" (139cm)",
  "currency": "CZK",
  "inStock": true,
  "img": "https://img.okay.cz/gal/tv-s-uhloprickou-55-139-cm-oled-televize-philips-55oled754-12-2019-55-139cm-original-1332693.jpg"
}
```
