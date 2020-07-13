/* global cleanPrice */

window.shops = window.shops || {};
window.shops["aaaauto"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const url = new URL(location.href);
    const itemId = url.searchParams.get("id");

    const title = document.querySelector("#carCardHead h1").innerText;
    const price = document.querySelector(".sidebar ul.infoBoxNav li:not([style]):not([class]) span.notranslate");
    const originalPrice = cleanPrice(price.firstChild);
    const currentPrice = cleanPrice(price.lastChild);

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".sidebar .infoBox .btnSubText");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
