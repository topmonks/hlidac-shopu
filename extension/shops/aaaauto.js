/* global cleanPrice */

window.shops = window.shops || {};
window.shops["aaaauto"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const url = new URL(location.href);
    const itemId = url.searchParams.get("id");
    if (!itemId) return false;

    // eng variant
    const engTabCard = document.querySelector("#tab-card");
    if (engTabCard) {
      const title = engTabCard.querySelector("h1").textContent;
      const priceRows = engTabCard.querySelectorAll("#priceTable .priceRow");
      let currentPrice;
      if (priceRows.length == 2) {
        currentPrice = cleanPrice(engTabCard.querySelector("#priceTable .carPrice span"));
      } else {
        currentPrice = cleanPrice(engTabCard.querySelector("#priceTable .priceRow:last-child span"));
      }

      const originalPrice = null;
      return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
    }
    const title = document.querySelector("#carCardHead h1").innerText;
    const price = document.querySelector(".sidebar ul.infoBoxNav li:not([style]):not([class]) span.notranslate");
    const originalPrice = cleanPrice(price.firstChild);
    const currentPrice = cleanPrice(price.lastChild);

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    let elem = document.querySelector(".sidebar .infoBox .btnSubText");
    if (elem) {
      const markup = chartMarkup();
      elem.insertAdjacentHTML("afterend", markup);
      return elem;
    }

    // eng variant
    elem = document.querySelector("#carButtons .testdrive-bonus");
    if (!elem) throw new Error("Element to add chart not found");

    const table = document.querySelector("#carButtons table");
    table.style.position = "relative";
    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
