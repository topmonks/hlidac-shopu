# grizly.cz / grizly.sk

https://www.grizly.cz/ in source code there are the lowest level categories under `.sub-menu--3` lists, those are reached and scraped. If "next page"
 button is present, its link is added to queue as well.
Top-level categories (`.level-1`) are scraped too, with their subcategory tiles (`.subcategories a.linkImg2`) - the promo category
does not list products of its subcategories, e.g. multipacks in `/skupinova-baleni`.
## Actor's INPUT

```json
{
  "country": "CZ" || "SK"
}
```
