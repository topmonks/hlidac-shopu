import parseCurrency from "parsecurrency";

export async function extractItems(
  $,
  log,
  request,
  country,
  domain,
  requestQueue
) {
  const itemsArray = [];
  const visitDetails = [];
  // products
  $("div.browsingitem").each(function () {
    const result = {};
    // data id of the item to not enqueue the items multiply
    if ($(this).attr("data-id").length !== 0) {
      result.itemId = $(this).attr("data-id");
    }

    // adding data-code as Alza has only this id in their data
    if ($(this).attr("data-code").length !== 0) {
      result.itemCode = $(this).attr("data-code");
    }

    if ($(this).find("a.pc.browsinglink img").length !== 0) {
      const img = $(this).find("a.pc.browsinglink img");
      result.img = img.data("src");
    }
    if ($(this).find("a.name.browsinglink").length !== 0) {
      result.itemUrl = `${domain.baseUrl}${$(this)
        .find("a.name.browsinglink")
        .first()
        .attr("href")}`;
      result.itemName = $(this)
        .find("a.name.browsinglink")
        .first()
        .text()
        .replace(/(\n|\r)/g, "")
        .trim();
    }

    if ($(this).find("div.pricea").length !== 0) {
      result.discountedName = $(this).find("div.pricea").text().trim();
    }

    if ($(this).find("div.price .c2").text().match(/\d+/) !== null) {
      const currentPriceText = parseCurrency(
        $(this).find("div.price .c2").text().replace(/\s+/g, "")
      );
      result.currentPrice =
        currentPriceText && currentPriceText.value
          ? currentPriceText.value
          : parseInt(
              $(this)
                .find("div.price .c2")
                .text()
                .replace(/\s+/g, "")
                .match(/\d+/)[0],
              10
            );
    }

    const priceText = $(this).find("div.price .npc .np2").text();
    if (priceText.match(/\d+/) !== null) {
      const originalPriceText = parseCurrency(priceText.replace(/\s+/g, ""));
      result.originalPrice =
        originalPriceText?.value ??
        parseInt(priceText.replace(/\s+/g, "").match(/\d+/)[0], 10);
    }

    result.rating = $(this).find("div[data-rating]").attr("data-rating");
    result.discounted = result.originalPrice < result.originalPrice;

    if (
      $(this).find("img").attr("data-src").split(/\//).pop().indexOf(".") !== -1
    ) {
      const imgBaseUrl = domain.baseUrl.replace("www.alza", "i.alza");
      let imageId = $(this)
        .find("img")
        .attr("data-src")
        .split(/\//)
        .pop()
        .split(".")[0];
      result.img = `${imgBaseUrl}/ImgW.ashx?fd=f3&cd=${imageId}`;
    }

    if (
      $(this).find('span:contains("Těšíme se")').length !== 0 ||
      $(this).find('span:contains("Cena nebyla stanovena")').length !== 0 ||
      $(this).find(".price").text().trim().length === 0
    ) {
      result.currentPrice = "Price not defined.";
    } else if ($(this).find(".c4").length !== 0) {
      result.currentPrice = "Price not defined.";
    } else if ($(this).find(".watchDog").length !== 0) {
      result.currentPrice = "Price not defined.";
    }
    result.category = [];
    $(".breadcrumbs a:not(.first)").each(function () {
      result.category.push($(this).text().trim());
    });

    result.currency = domain.currency;
    // check if there is quantity discout or recommend discount
    // in those cases we need to visit detail to get real discount
    if (
      $(this).find('[data-name="QuantityDiscount"]').length !== 0 ||
      $(this).find('span.dynamicPromo:contains("Sdílej a ušetři")').length !==
        0 ||
      $(this).find('span.dynamicPromo:contains("Zdieľaj a ušetri")').length !==
        0 ||
      ($(this).find("div.price .c2").length !== 0 &&
        $(this).find('div.price .c2:contains("od")').length !== 0)
    ) {
      visitDetails.push({
        url: result.itemUrl,
        userData: {
          label: "DETAIL",
          result
        }
      });
    } else {
      itemsArray.push(result);
    }
  });

  log.info(
    `Added ${visitDetails.length}x detail pages to queue, ${request.url}`
  );
  for (const item of visitDetails) {
    await requestQueue.addRequest(item, { forefront: true });
  }

  // skip items without name
  const results = itemsArray.filter(item => item.itemName && item.currentPrice);

  if (results.length !== 0) return results;
  // in case all items on page has quantity discount or are in recommend sales
  if (visitDetails.length !== 0) return true;
}

export async function parseDetail($, request) {
  const { result } = request.userData;
  if ($('.row.sel[data-cntfrom="1"] .colValue').length !== 0) {
    const currentPriceText = parseCurrency(
      $('.row.sel[data-cntfrom="1"] .colValue').text().trim()
    );
    result.currentPrice = currentPriceText.value;
  }
  if ($("span.price_withVat").length !== 0) {
    const currentPriceText = parseCurrency(
      $("span.price_withVat").text().trim()
    );
    result.currentPrice = currentPriceText.value;
  }

  if ($("span.crossPrice").length !== 0) {
    const originalPriceText = parseCurrency($("span.crossPrice").text().trim());
    result.originalPrice = originalPriceText.value;
  }

  if ($("tr.mediaMagazinesPrice").length !== 0) {
    const currentPriceText = parseCurrency(
      $("tr.mediaMagazinesPrice").first().find("span.price").text().trim()
    );
    result.currentPrice = currentPriceText.value;
    result.originalPrice = null;
  }

  return result;
}
