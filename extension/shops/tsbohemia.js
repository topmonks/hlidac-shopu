/* global $ */

window.shops = window.shops || {};
window.shops["tsbohemia"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $("#stoitem_detail");
    if (!elem) return;
    const itemId = $(".sti_detail_head").dataset.stiid;
    const title = $("h1").textContent.trim();

    return { itemId, title};
  },

  insertChartElement(chartMarkup) {
    const elem = $(".statusnote");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
