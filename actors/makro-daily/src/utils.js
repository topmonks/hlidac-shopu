import Apify from "apify";

const {
  utils: { log }
} = Apify;

export function parseItems($, request) {
  const breadCrubms = [];
  $("ol.breadcrumb li").each(function () {
    breadCrubms.push($(this).text().trim());
  });

  const results = [];

  $("div.product").each(function () {
    const itemName =
      $(this).find("h3.product-title").length !== 0
        ? $(this).find("h3.product-title").text().trim()
        : null;
    const url =
      $(this).find("h3.product-title a").length !== 0
        ? $(this).find("h3.product-title a").attr("href")
        : null;
    let priceElement = $(this).find(".product-price-value-primary");
    if (priceElement.length === 0) {
      priceElement = $(this).find(".product-price-value");
    }
    const currentPriceText =
      priceElement.length !== 0
        ? priceElement
            .first()
            .text()
            .replace(/(\s)/g, "")
            .replace(/,/, ".")
            .trim()
        : null;
    const currentPrice = currentPriceText
      ? parseFloat(currentPriceText.match(/\d+\.\d+/)[0])
      : "Price not defined.";
    const itemId =
      $(this).find("a[data-shopid].product-menu-item").length !== 0
        ? $(this).find("a[data-shopid].product-menu-item").attr("data-shopid")
        : null;
    const discounted = $(this).find('img[title="Akce"]').length !== 0;
    const image =
      $(this).find(".product-photo img").length !== 0
        ? $(this).find(".product-photo img").attr("src")
        : null;
    const currency = currentPriceText
      ? currentPriceText.split(currentPriceText.match(/\d+\.\d+/)[0])[1]
      : "CZK";
    results.push({
      itemName,
      url,
      itemUrl: url,
      currentPrice,
      itemId,
      discounted,
      currency,
      img:
        image && image.includes("https")
          ? image
          : `https://sortiment.makro.cz${image}`,
      category: breadCrubms.join(",")
    });
  });
  log.info(`Found ${results.length} on ${request.url}`);
  return results;
}
