# iglobus.cz

Eshop běží na https://shop.iglobus.cz/, před nákupem je ale potřeba nejprve zvolit kamenný obchod.
Proto je `ROOT` URL nastavena na `/store/switch?store=${store}&referer-url=/cs/outlet?ipp=72` kdy **72** je maximální počet produktů na stránku. Dále jsou procházeny pouze hlavní kategorie. Snad obsahují vše.


```js
const STORES = {
  ZLI: "ZLI",
  OST: "OST"
};
const {
  development = false,
  maxRequestRetries = 3,
  maxConcurrency = 50,
  proxyGroups = ["CZECH_LUMINATI"],
  store = STORES.OST
} = input ?? {};
```

``` 
{
  "itemId": "33744",
  "itemName": "TTD Cukr bílý krupice 1 kg",
  "itemUrl": "https://shop.iglobus.cz/cz/ttd-cukr-bl-krupice-1-kg/8594000230274",
  "img": "https://gapi.globus.cz/OnlineAsset/3/asset?assetID=c20fb5e0-ee10-4844-bcf6-1645a6b43711&type=3",
  "currentPrice": "11.90",
  "originalPrice": "19.90",
  "currentUnitPrice": "11.9",
  "useUnitPrice": false,
  "discounted": true,
  "currency": "CZK",
  "category": "Akce"
}
``` 