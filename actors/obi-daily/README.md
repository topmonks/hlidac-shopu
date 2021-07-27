### Obi eshop
```
obi.cz
obi.sk
obi.de
obi.pl
obi.ch
obi.hu
obi.ru
obi.at
obi-italia.it
```

### INPUT development
```
{
  "country": "cz",
  "development": true,
  "debug": true,
  "proxyGroups": ["CZECH_LUMINATI"],
  "maxRequestRetries": 3,
  "maxConcurrency": 10
}
```

### INPUT production
```
{
  "country": "cz"
}
```
where country: cz, sk, de, pl, ch, hu, ru, at, it

### OUTPUT
```
{
  "itemUrl": "https://www.obi.cz/vyrovnavaci-hmoty/beton-hobby-20-kg/p/4626123",
  "itemName": "Beton Hobby 20 kg",
  "itemId": "4626123",
  "currency": "CZK",
  "currentPrice": 45,
  "discounted": false,
  "originalPrice": null,
  "inStock": true,
  "img": "https://images.obi.cz/product/CZ/1500x1500/462612_1.jpg",
  "category": "Stavba/Stavební materiály/Omítky, malty a cement/Vyrovnávací hmoty"
}
```
