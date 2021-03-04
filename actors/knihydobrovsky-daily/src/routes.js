const Apify = require("apify");

const {
  utils: { log }
} = Apify;

const completeUrl = x => `https://www.knihydobrovsky.cz${x}`;

exports.handleStart = async ({ request, $ }, requestQueue) => {
  const links = $("#main div.row-main li a")
    .not('div:contains("Magnesia Litera")')
    .map(function () {
      return $(this).attr("href");
    })
    .get()
    .filter(
      x =>
        !x.includes("magnesia-litera") &&
        !x.includes("velky-knizni-ctvrtek") &&
        !x.includes("knihomanie")
    );
  const absoluteLinks = links.map(x => completeUrl(x));
  for (const link of absoluteLinks) {
    await requestQueue.addRequest({ url: link, userData: { label: "LIST" } });
  }
};

exports.handleSubList = async ({ request, $ }, requestQueue) => {
  // if there are more subcategories enque urls...
  if ($("#bookGenres").text()) {
    const links = $("#bookGenres")
      .next("nav")
      .find("a")
      .map(function () {
        return $(this).attr("href");
      })
      .get();
    const absoluteLinks = links.map(x => completeUrl(x));
    for (const link of absoluteLinks) {
      await requestQueue.addRequest({
        url: link,
        userData: { label: "SUBLIST" }
      });
    }
    //put this page also to queue as LIST page
  }
  await requestQueue.addRequest({
    url: request.url,
    uniqueKey: `${request.url}?currentPage=1`,
    userData: { label: "LIST" }
  });
};

exports.handleList = async ({ request, $ }, requestQueue, handledIds) => {
  // Handle pagination
  const nextPageUrl =
    $('span:contains("Další")').parent("a").attr("href") &&
    completeUrl($('span:contains("Další")').parent("a").attr("href").trim());
  if (nextPageUrl) {
    await requestQueue.addRequest({
      url: nextPageUrl,
      userData: { label: "LIST" }
    });
  }

  // Handle items
  const result = [];
  $("li[data-productinfo]").each(function () {
    const item = {};
    const dataLink = $("a.buy-now", this).attr("data-link");
    if (dataLink) {
      item.itemId = parseInt(dataLink.split("productId=")[1]);
    } else {
      item.itemId = $("h3 a", this).attr("href").split("-").slice(-1).pop();
    }
    if (!item.itemId) {
      log.info("skipping product - could not find itemId, product:", {
        "name": $("span.name", this).text()
      });
      return;
    }
    item.itemId = item.itemId.toString();
    if (handledIds.has(item.itemId)) {
      return;
    }
    item.img = $("picture img", this).attr("src");
    item.itemUrl = completeUrl($("h3 a", this).attr("href"));
    item.itemName = $("span.name", this).text();
    item.currentPrice = parseInt($("p.price strong", this).text(), 10);
    if (!item.currentPrice) {
      log.info("skipping product - could not find price, product:", {
        "name": $("span.name", this).text()
      });
      return;
    }
    item.originalPrice = parseInt(
      $("p.price span.price-strike", this).text(),
      10
    );
    item.discounted = item.currentPrice < item.originalPrice;
    if (!item.discounted) item.originalPrice = null;
    item.rating = parseFloat(
      $("span.stars.small span", this).attr("style").split("width: ")[1]
    );
    item.currency = "CZK";
    item.inStock = $("a.buy-now", this).text().includes("Do košíku");
    result.push(item);
  });

  await Apify.pushData(result);
  result.forEach(x => handledIds.add(x.itemId));
};
