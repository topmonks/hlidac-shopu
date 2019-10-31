/* global $ */

window.shops = window.shops || {};
window.shops["rohlik"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $("#productDetail");
    if (!elem) return;
    const itemId = $("button[data-product-id]").dataset.productId;
    const title = document.title.split("-");
    const t = title[0].trim();

    return { itemId, t };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".AmountCounter");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
