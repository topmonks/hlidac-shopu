# grizly.cz / grizly.sk

https://www.grizly.cz/ in source code there are the lowest level categories under `.sub-menu--3` lists, those are reached and scraped. All pages of a category
are queued at once from the "last page" link of its first page (the "next page" link is only a fallback), so one failed page
does not drop the rest of the category. The site randomly serves existing category pages as empty
(`.alert-catalog-empty`, "Požadovaný obsah nenalezen."), such pages are retried.
Top-level categories (`.level-1`) are scraped too, with their subcategory tiles (`.subcategories a.linkImg2`) - the promo category
does not list products of its subcategories, e.g. multipacks in `/skupinova-baleni`.
## Actor's INPUT

```json
{
  "country": "CZ" || "SK",
  "proxyGroups": ["RESIDENTIAL"]
}
```

grizly.cz is behind Cloudflare, `proxyGroups` has to be set: without it the actor uses `CZECH_LUMINATI`
(default of `getInput`) and most requests get 403.
