/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["mountfield"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".productDetail");
    if (!elem) return;
    const itemId = $(".j-barcode-text")
      .textContent.trim()
      .toLowerCase();
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".actionPrice.val");
    const originalPrice = cleanPrice(".retailPrice.val");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".productCompare");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup({ clear: "right", float: "right", width: "338px" });
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};
