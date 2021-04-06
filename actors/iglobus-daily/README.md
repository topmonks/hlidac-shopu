# iglobus.cz scraper

The actor will scrape all products from [iglobus.cz](https://www.iglobus.cz). It is going through the whole categories and pagination, gets the link to the product details and gets data in format as shown below.

Example item:

``` 
{
  "itemId": "00546548004",
  "itemName": "Globus Kaiserka 60 g",
  "itemImgUrl": "https://www.iglobus.cz/zobrazit-obrazek/product/3996e332-54ff-42a5-a98a-e072c527245f(1).jpg?path=/product/3996e332-54ff-42a5-a98a-e072c527245f(1).jpg&maxWidth=300&maxHeight=300",
  "itemCategoryPage": "Úvod=>Pekárna a cukrárna=>Slané pečivo=>Housky a kaiserky",
  "itemUrl": "https://www.iglobus.cz/produkt/kaiserka-60g",
  "currentPrice": 1.5,
  "originalPrice": 2.9,
  "discounted": true,
  "currency": "CZK"
}
``` 