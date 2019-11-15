/* global cleanPrice */

window.shops = window.shops || {};
window.shops["czc"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const itemId = elem.dataset.productCode;
    const title = document.querySelector("h1").getAttribute("title");
    const currentPrice = cleanPrice(".price .price-vatin");
    const originalPrice = cleanPrice(".price-before .price-vatin");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".pd-price-delivery");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};
