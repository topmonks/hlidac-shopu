/* global cleanPrice */

window.shops = window.shops || {};
window.shops["benu"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const title = document.querySelector(".product-title-rating .title").innerText;
    const itemId = document.querySelector("table.info-table tr:nth-child(2) td").innerText;
    const currentPrice = cleanPrice(".buy strong.buy-box__big-price");
    const originalPrice = cleanPrice(".buy .buy-box__price-head del");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-desc");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};
