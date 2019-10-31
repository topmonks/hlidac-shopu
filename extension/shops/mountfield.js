/* global $ */

window.shops = window.shops || {};
window.shops["mountfield"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $(".productDetail");
    if (!elem) return;
    const itemId = $(".j-barcode-text").textContent.trim();
    const title = $("h1").textContent.trim();

    return { itemId, title, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".productDetailPriceTable");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
