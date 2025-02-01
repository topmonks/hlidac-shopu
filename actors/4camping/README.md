# 4camping

1. Get list of categories from https://www.4camping.cz/sitemap/categories/
2. Get categoryId from `body.className` `current-cat-id-${categoryId}`
3. POST on https://www.4camping.cz/api/parametric-search/ 
   ```json
   {"typeClassname":"ParametricSearch\\Type\\Category",
    "options":{"categoryId":categoryId,"additionalCategoryIds":[]},
    "sort":null,
    "page":2,
    "conditions":{},
    "baseConditions":{"codebookParameters":{"771":[12041]}},
    "existingFilters":{},
    "lang":"cs",
    "currency":"czk"}
   ```

## Actor's INPUT

```json
{
    "debug": false,
    "proxyGroups": [],
    "type": "FULL"
}
```

## Example output

```json
{
	"slug": "26992679",
	"itemId": "26992679",
	"itemUrl": "https://www.albert.cz/shop/Dite/Vyziva/Kapsicky-a-snacky/Ovocne-kapsicky/Nature-s-Promise-Bio-Baby-Pyre-jablko-mrkev-bana/p/26992679",
	"itemName": "Nature's Promise Bio Baby Pyré jablko, mrkev, baná",
	"img": "https://www.albert.cz/medias/sys_master/hfc/hfb/9009395662878.jpg",
	"currentPrice": 16.9,
	"originalPrice": 15.9,
	"currency": "CZK",
	"discounted": true,
	"useUnitPrice": false,
	"currentUnitPrice": 16.9,
	"originalUnitPrice": 176.94,
	"unit": "piece",
	"category": "Dítě > Výživa > Bio výživa > Bio kapsičky",
	"inStock": true
}
```
