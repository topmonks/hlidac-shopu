async function parseTrhakDetail($, domain, request) {
  const result = {
    itemUrl: request.url
  };
  const match = request.url.match(/[0-9]+\.htm/g);
  if (match) {
    result.itemId = match[0].replace(".htm", "");
  } else {
    const commId = $("a.expres");
    if (commId.length !== 0) {
      result.itemId = commId.data("commodityid");
    }
  }

  const itemName = $("h1");
  if (itemName.length !== 0) {
    result.itemName = itemName.text().trim();
  }
  const img = $("#imgMain");
  if (img.length !== 0) {
    result.img = img.data("src");
  }
  result.discounted = true;
  result.currency = domain.currency;
  const mediaPrice = $("#prices .mediaMagazinesPrice");
  if (mediaPrice && mediaPrice.length !== 0) {
    const price = mediaPrice.find("td.c3").text().trim();
    const matchCurPrice = price.replace(/\s/gm, "").match(/^[0-9]+/g);
    if (matchCurPrice) {
      result.currentPrice = parseInt(matchCurPrice[0], 10);
    }
  } else {
    const origPrice = $(".priceCompare > .c2").text().trim();
    const matchOrigPrice = origPrice.replace(/\s/gm, "").match(/^[0-9]+/g);
    if (matchOrigPrice) {
      result.originalPrice = parseInt(matchOrigPrice[0], 10);
    }

    const curPrice = $(".pricenormal > .c2").text().trim();
    const matchCurPrice = curPrice.replace(/\s/gm, "").match(/^[0-9]+/g);
    if (matchCurPrice) {
      result.currentPrice = parseInt(matchCurPrice[0], 10);
    }
  }
  result.category = [];
  result.category.push("TRHAK");
  $(".breadcrumbs a:not(.first)").each(function () {
    result.category.push($(this).text().trim());
  });

  return result;
}

module.exports = { parseTrhakDetail };
