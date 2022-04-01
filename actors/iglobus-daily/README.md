# iglobus.cz

Eshop běží na https://shop.iglobus.cz/, před nákupem je ale nejprve potřeba zvolit kamenný obchod.
Proto je `ROOT` URL nastavena na `/store/switch?store=${store}&referer-url=/cs/outlet&ipp=72`, kde 
* `${store}` je název kamenného obchodu
* `/cs/outlet` je cesta k první kategorii ("Akce")
* `ipp` je počet položek na stránce, **72** je maximální hodnota a `page` je číslo stránky


## INPUT
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
## OUTPUT
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