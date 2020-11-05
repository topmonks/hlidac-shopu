/* global cleanPrice */

const aaaAuto = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const url = new URL(location.href);
    const itemId = url.searchParams.get("id");
    if (!itemId) return false;
    const imageUrl = document.querySelector("meta[name='og:image']").content;

    // eng variant
    const engTabCard = document.querySelector("#tab-card");
    if (engTabCard) {
      const title = engTabCard.querySelector("h1").textContent;
      const priceRows = engTabCard.querySelectorAll("#priceTable .priceRow");
      let currentPrice;
      if (priceRows.length === 2) {
        currentPrice = cleanPrice(
          engTabCard.querySelector("#priceTable .carPrice span")
        );
      } else {
        currentPrice = cleanPrice(
          engTabCard.querySelector("#priceTable .priceRow:last-child span")
        );
      }

      const originalPrice = null;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    const title = document.querySelector("#carCardHead h1").innerText;
    const price = document.querySelector(`
      .sidebar ul.infoBoxNav li:not([style]):not([class]) span.notranslate,
      .sidebar ul.infoBoxNav .fixedBarScrollHide span.notranslate,
      .sidebar ul.infoBoxNav .infoBoxNavTitle span.notranslate
    `);
    const originalPrice =
      price && price.hasChildNodes() ? cleanPrice(price.firstChild) : null;
    const currentPrice =
      price && price.hasChildNodes()
        ? cleanPrice(price.lastChild)
        : cleanPrice(price);

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    let elem = document.querySelector(".sidebar .infoBox .bonusText");
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

window.shops = window.shops || {};
window.shops["aaaauto"] = aaaAuto;
window.shops["aaaauto_sk"] = aaaAuto;
