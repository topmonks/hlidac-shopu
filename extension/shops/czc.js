/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["czc"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product-detail");
    if (!elem) return;
    const itemId = elem.dataset.productCode;
    const title = $("h1").getAttribute("title");
    const currentPrice = cleanPrice(".price .price-vatin");
    const originalPrice = cleanPrice(".price-before .price-vatin");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#product-price-and-delivery-section");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
