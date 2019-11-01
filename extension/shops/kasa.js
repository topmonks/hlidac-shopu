/* global $ */

window.shops = window.shops || {};
window.shops["kasa"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $(".product-detail");
    if (!elem) return;
    const inputZbozi = $("input[name=\"zbozi\"]");
    const itemId = inputZbozi.getAttribute('value');
    const title = $("h1").textContent.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".price-info");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
