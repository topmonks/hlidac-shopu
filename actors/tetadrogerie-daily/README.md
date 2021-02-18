# Teta Drogerie actor

Scrapes data from `https://www.tetadrogerie.cz/eshop?pocet=${pageSize}&stranka=${page}`

* Optimal `pageSize` is `100`. It is unbounded but slow.
* Categories urls are href attributes of `a[data-category]`
* Categories are hierarchical and parent contains items from subcategories.
* Leaf categories are children of `ul.j-cat-3`, middle categories of `ul.j-cat-2` and top categories of `ul.j-shop-categories-menu`  
* Pagination can be driven by `stranka` GET parameter, indexed from 1.
* Items count `.j-product-count-main`
* Teta has Slovak version but without e-shop. 
* items are `.j-products .j-item`
* itemName `.sx-item-title`
* itemUrl `.sx-item-title[href]`
* itemId `.j-product[data-skuid]`
* originalPrice `.sx-item-price-action+.sx-item-price-initial`
* currentPrice `.sx-item-price-action, .sx-item-price-initial`
* img `img`
* category `.sx-breadcrumbs.sx-breadcrumbs-middle`

## Actors INPUT

```json
{}
```