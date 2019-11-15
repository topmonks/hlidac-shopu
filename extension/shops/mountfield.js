/* global cleanPrice */

window.shops = window.shops || {};
window.shops["mountfield"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".productDetail");
    if (!elem) return;
    const itemId = document
      .querySelector(".j-barcode-text")
      .textContent.trim()
      .toLowerCase();
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".actionPrice.val");
    const originalPrice = cleanPrice(".retailPrice.val");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".productCompare");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup({
      clear: "right",
      float: "right",
      width: "338px"
    });
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};
