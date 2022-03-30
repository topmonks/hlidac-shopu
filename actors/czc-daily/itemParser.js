export async function extractItems($, request, web) {
  const results = [];
  if ($("#tiles div[data-ga-impression]").length !== 0) {
    $("#tiles div[data-ga-impression]").each(function () {
      const result = {};

      if ($(this).find("div.tile-title a").length !== 0) {
        result.itemUrl = web + $(this).find("div.tile-title a").attr("href");
      }
      if ($(this).find("span.data-code").length !== 0) {
        result.itemId = $(this).find("span.data-code").text().trim();
      }
      if ($(this).find("[class*='title'] a").length !== 0) {
        result.itemName = $(this).find("[class*='title'] a").text().trim();
        // console.log(result.name);
      }

      result.inStock =
        $(this).find("span.availability-state-on-stock").length > 0;

      if (
        $(this).find("div.price-wrapper").eq(0).find("span.alone").length !== 0
      ) {
        const priceText = $(this)
          .find("div.price-wrapper")
          .eq(0)
          .find("span.alone")
          .eq(0)
          .find("span.price-vatin")
          .text()
          .replace(/\s+/g, "")
          .trim();
        if (priceText.match(/\d+/) !== null) {
          result.currentPrice = parseFloat(priceText.match(/\d+/)[0]);
        } else {
          result.currentPrice = priceText;
        }
      } else if (
        $(this).find("div.price-wrapper").eq(0).find("span.price.action")
          .length !== 0 &&
        $(this).find("div.price-wrapper").eq(0).find("span.price-before")
          .length !== 0
      ) {
        result.currentPrice = parseFloat(
          $(this)
            .find("div.price-wrapper")
            .eq(0)
            .find("span.price.action")
            .eq(0)
            .find("span.price-vatin")
            .text()
            .replace(/\s+/g, "")
            .trim()
            .match(/\d+/)[0]
        );
        result.originalPrice = parseFloat(
          $(this)
            .find("div.price-wrapper")
            .eq(0)
            .find("span.price-before")
            .eq(0)
            .find("span.price-vatin")
            .text()
            .replace(/\s+/g, "")
            .trim()
            .match(/\d+/)[0]
        );
      } else {
        result.currentPrice = "Price not defined.";
      }

      result.discounted = $(this).find(".action").length !== 0;

      if ($(this).find("img").last().attr("data-src").length !== 0) {
        result.img = $(this)
          .find("img")
          .last()
          .attr("data-src")
          .replace("_2", "_1");
      }
      result.category = [];
      $(".breadcrumbs a:not([class])").each(function () {
        result.category.push($(this).text().trim());
      });
      result.paginationUrl = request.url;

      results.push(result);
    });
    return results;
  }
  console.log({
    status: "No items for this pagination, check it out.",
    url: request.url
  });
}
