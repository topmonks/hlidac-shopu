# Okay scraper

The Actor scrapes all products from [Okay.cz](https://www.okay.cz/) or [Okay.sk](https://www.okay.sk/).

It goes through all product links listed in sitemap, emulates what would happen on the detail page with regard to displaying prices,
and gets the data in format as shown below.

Example item:
``` 
{
	"itemId": "6763810816042",
	"itemUrl": "https://www.okay.cz/products/rohova-kuchyne-aurelia-levy-roh-240x180-cmbila-vysoky-lesk-lak",
	"img": "http://www.okay.cz/cdn/shop/products/rohova-kuchyne-aurelia-levy-roh-240x180-cm-bila-vysoky-lesk-lak-90657_600x.jpg?v=1710162832",
	"itemName": "Rohová kuchyně Aurelia levý roh 240x180 cm(bílá vysoký lesk,lak)",
	"originalPrice": 30209,
	"currentPrice": 25692.99,
	"discounted": true,
	"currency": "CZK",
	"category": "NÁBYTEK > Kuchyně, jídelny > Kuchyňské linky > Rohové kuchyně",
	"inStock": true
}
```