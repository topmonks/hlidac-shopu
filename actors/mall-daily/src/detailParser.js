const parseCurrency = require("parsecurrency");

async function extractItems($, web, country) {
  const results = [];
  if ($("div[ng-attr-data-main-id]").length !== 0) {
    $("div[ng-attr-data-main-id]").each(function () {
      const result = {};
      if ($(this).attr("ng-attr-data-main-id").length !== 0) {
        result.itemId = $(this).attr("ng-attr-data-main-id");
        result.img = `${web}/i/${result.itemId}/1000/1000`;
      }
      if ($(this).find("h3").length !== 0) {
        result.itemName = $(this).find("h3").eq(0).text().trim();
        if (result.itemName.match(/\n/)) {
          result.itemName =
            result.itemName.split(/\n/).length !== 0
              ? result.itemName.split(/\n/)[0].trim()
              : result.itemName;
        }
      }
      if (
        $(this).find("del.lst-product-item-price--retail").eq(0).length !== 0
      ) {
        const oldPriceText = parseCurrency(
          $(this)
            .find("del.lst-product-item-price--retail")
            .eq(0)
            .text()
            .replace(/\s+/g, "")
            .trim()
        );
        result.originalPrice =
          oldPriceText && oldPriceText.value
            ? oldPriceText.value
            : $(this)
                .find("del.lst-product-item-price--retail")
                .eq(0)
                .text()
                .replace(/\s+/g, "")
                .trim();
      }

      if (
        $(this).find("span.lst-product-item-price-value").eq(0).length !== 0
      ) {
        const priceText = $(this)
          .find("span.lst-product-item-price-value")
          .eq(0)
          .text()
          .replace(/\s+/g, "")
          .trim();
        if (priceText.match(/\d+/) !== null) {
          const priceTextParsed = parseCurrency(priceText);
          result.currentPrice =
            priceTextParsed && priceTextParsed.value
              ? priceTextParsed.value
              : priceText;
        } else {
          result.currentPrice = "Price not defined.";
        }
      }

      if ($(this).find('p:contains("Akce")').length !== 0) {
        result.discounted = true;
      } else {
        result.discounted = false;
      }

      if ($(this).find("a.lst-product-item-media").length !== 0) {
        result.itemUrl =
          web + $(this).find("a.lst-product-item-media").eq(0).attr("href");
      }

      if ($(this).find("article[data-id]").length !== 0) {
        result.productId = $(this).find('input[name="articleId"]').val();
      } else if ($(this).find("a[id]").length !== 0) {
        result.productId = $(this).find("a[id]").eq(0).attr("id");
      }

      if ($(this).find("product-availability").length !== 0) {
        const sellerName = $(this)
          .find("product-availability")
          .attr("availability-key");
        result.thirdPartySeller = sellerName !== "avail_stock-mall";
      }

      result.category = [];
      $("#breadcrumbs")
        .find('span[itemprop="name"]')
        .each(function () {
          result.category.push($(this).text().trim());
        });

      result.currency = country === "CZ" ? "CZK" : "EUR";

      results.push(result);
    });
  }
  return results;
}

module.exports = extractItems;
