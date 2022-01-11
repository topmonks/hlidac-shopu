function getBreadCrumbs(categoryId, jsonCategories) {
  const breadcrumbs = [];
  while (jsonCategories[categoryId]) {
    const category = jsonCategories[categoryId];
    breadcrumbs.push(category.name);
    categoryId = category.parentId;
  }
  breadcrumbs.reverse();
  return breadcrumbs;
}

function getItems(items, jsonCategories) {
  const results = [];
  for (const item of items) {
    const result = {
      img: item.imgPath ? item.imgPath : null,
      itemId: item.productId ? item.productId : null,
      itemUrl: item.baseLink ? `https://www.rohlik.cz/${item.baseLink}` : null,
      itemName: item.productName ? item.productName : null,
      discounted: false,
      currentPrice: item.price && item.price.full ? item.price.full : null,
      currentUnitPrice:
        item.pricePerUnit && item.pricePerUnit.full
          ? item.pricePerUnit.full
          : null,
      currency: item.price.currency ? item.price.currency : null,
      inStock: item.inStock,
      useUnitPrice: item.textualAmount.includes("cca")
    };
    if (item.sales.length !== 0) {
      for (const sale of item.sales) {
        if (sale.type === "sale") {
          result.originalPrice = result.currentPrice;
          result.originalUnitPrice = result.currentUnitPrice;
          result.currentPrice =
            sale.price && sale.price.full ? sale.price.full : null;
          result.currentUnitPrice =
            sale.priceForUnit && sale.priceForUnit.full
              ? sale.priceForUnit.full
              : null;
          result.discounted = true;
          /*
                    console.log('#### DISCOUNTED ####')
                    console.log(result);
                    */
        }
      }
    } else if (item.goodPrice) {
      const { originalPrice } = item;
      result.originalPrice = originalPrice.full;
      result.discounted = true;
    }
    result.breadcrumbs = getBreadCrumbs(item.mainCategoryId, jsonCategories);
    results.push(result);
  }
  return results;
}
module.exports = getItems;
